"""Server-side gate for the local-only ocular calibration used in research sessions."""

from __future__ import annotations

import hashlib
import math
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .consent import consent_status
from .models import Enrollment, ResearchCalibration, SecurityAuditEvent, Session, User


CALIBRATION_VERSION = "ocular-local-v2"
PHASES = ("frontal", "eyes_left", "eyes_right", "front_return")
PROFILES = ("low", "balanced", "high")


class ResearchCalibrationSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)
    calibration_version = serializers.CharField(max_length=64)
    execution_profile = serializers.ChoiceField(choices=PROFILES)
    sample_counts = serializers.DictField(child=serializers.IntegerField(min_value=0, max_value=60))
    quality = serializers.DictField()
    duration_ms = serializers.IntegerField(min_value=1000, max_value=120000)

    def validate(self, attrs):
        if attrs["calibration_version"] != CALIBRATION_VERSION:
            raise serializers.ValidationError({"calibration_version": "Versión de calibración no admitida."})
        counts = attrs["sample_counts"]
        if set(counts) != set(PHASES):
            raise serializers.ValidationError({"sample_counts": "Se requieren exactamente las cuatro fases."})
        minimum = settings.OCULAR_CALIBRATION_MIN_SAMPLES
        if any(counts[phase] < minimum for phase in PHASES):
            raise serializers.ValidationError({"sample_counts": "La calibración no alcanzó el mínimo de muestras."})
        quality = attrs["quality"]
        allowed = {"status", "directional_separation", "center_drift", "center_is_between_directions"}
        if set(quality) - allowed:
            raise serializers.ValidationError({"quality": "La evidencia contiene campos no permitidos."})
        if quality.get("status") != ResearchCalibration.STATUS_READY:
            raise serializers.ValidationError({"quality": "La calibración no está lista."})
        separation = quality.get("directional_separation")
        drift = quality.get("center_drift")
        centered = quality.get("center_is_between_directions")
        if type(separation) not in (int, float) or not math.isfinite(separation) or separation < 0.10 or separation > 1:
            raise serializers.ValidationError({"quality": "Separación direccional insuficiente."})
        if type(drift) not in (int, float) or not math.isfinite(drift) or drift < 0 or drift > 0.08:
            raise serializers.ValidationError({"quality": "Deriva central excesiva."})
        if centered is not True:
            raise serializers.ValidationError({"quality": "El centro debe quedar entre ambas direcciones."})
        return attrs


class ResearchCalibrationReuseSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)
    reuse_token = serializers.RegexField(r"^[A-Za-z0-9_-]{40,96}$", trim_whitespace=False)


def calibration_is_ready(session: Session) -> bool:
    if not settings.RESEARCH_SESSION_CALIBRATION_REQUIRED:
        return True
    try:
        calibration = session.research_calibration
    except ResearchCalibration.DoesNotExist:
        return False
    return calibration.status == ResearchCalibration.STATUS_READY


def _audit(actor, outcome, reason_code, session_id):
    SecurityAuditEvent.objects.create(
        actor=actor,
        action="research_calibration",
        outcome=outcome,
        reason_code=reason_code,
        resource_type="session",
        resource_id=str(session_id)[:64],
    )


def _owned_active_session(request, session_id):
    session = Session.objects.select_related("course", "student").filter(pk=session_id).first()
    if session is None or request.user.role != User.ROLE_STUDENT or session.student_id != request.user.id:
        _audit(request.user, "denied", "session_owner_mismatch", session_id)
        raise PermissionDenied("La sesión de calibración no es válida.")
    if session.ended_at is not None or not Enrollment.objects.filter(
        user=request.user,
        course=session.course,
        status=Enrollment.STATUS_ACTIVE,
    ).exists():
        _audit(request.user, "denied", "inactive_session", session_id)
        raise PermissionDenied("La sesión de calibración no está activa.")
    return session


def _research_consent_is_valid(user):
    consent = consent_status(user)
    return consent["capture_allowed"] and consent["purposes"]["research"]["granted"]


def _token_hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class ResearchCalibrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            session_id = int(request.query_params.get("session_id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "session_id inválido."}, status=status.HTTP_400_BAD_REQUEST)
        session = _owned_active_session(request, session_id)
        ready = calibration_is_ready(session)
        return Response(
            {
                "required": settings.RESEARCH_SESSION_CALIBRATION_REQUIRED,
                "ready": ready,
                "calibration_version": CALIBRATION_VERSION,
                "minimum_samples": settings.OCULAR_CALIBRATION_MIN_SAMPLES,
            }
        )

    def post(self, request):
        payload = ResearchCalibrationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        session = _owned_active_session(request, data["session_id"])
        if not _research_consent_is_valid(request.user):
            _audit(request.user, "denied", "research_consent_required", session.id)
            return Response({"detail": "Se requiere consentimiento de investigación vigente."}, status=409)
        reuse_token = secrets.token_urlsafe(32) if settings.OCULAR_CALIBRATION_REUSE_ENABLED else None
        valid_until = (
            timezone.now() + timedelta(hours=settings.OCULAR_CALIBRATION_REUSE_HOURS)
            if reuse_token
            else None
        )
        if reuse_token:
            ResearchCalibration.objects.filter(participant=request.user).update(
                reuse_token_hash="",
                valid_until=None,
            )
        calibration, created = ResearchCalibration.objects.update_or_create(
            session=session,
            defaults={
                "participant": request.user,
                "status": ResearchCalibration.STATUS_READY,
                "calibration_version": data["calibration_version"],
                "execution_profile": data["execution_profile"],
                "sample_counts": data["sample_counts"],
                "quality": data["quality"],
                "duration_ms": data["duration_ms"],
                "completed_at": timezone.now(),
                "reuse_token_hash": _token_hash(reuse_token) if reuse_token else "",
                "valid_until": valid_until,
            },
        )
        _audit(request.user, "allowed", "created" if created else "refreshed", session.id)
        return Response(
            {
                "required": settings.RESEARCH_SESSION_CALIBRATION_REQUIRED,
                "ready": True,
                "calibration_version": calibration.calibration_version,
                "minimum_samples": settings.OCULAR_CALIBRATION_MIN_SAMPLES,
                "reuse_token": reuse_token,
                "valid_until": valid_until,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ResearchCalibrationReuseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.OCULAR_CALIBRATION_REUSE_ENABLED:
            return Response(
                {"detail": "La reutilización de calibración no está habilitada."},
                status=status.HTTP_409_CONFLICT,
            )
        payload = ResearchCalibrationReuseSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        session = _owned_active_session(request, data["session_id"])
        if not _research_consent_is_valid(request.user):
            _audit(request.user, "denied", "research_consent_required", session.id)
            return Response({"detail": "Se requiere consentimiento de investigación vigente."}, status=409)

        now = timezone.now()
        source = (
            ResearchCalibration.objects.filter(
                participant=request.user,
                status=ResearchCalibration.STATUS_READY,
                calibration_version=CALIBRATION_VERSION,
                reuse_token_hash=_token_hash(data["reuse_token"]),
                valid_until__gt=now,
            )
            .order_by("-completed_at")
            .first()
        )
        if source is None:
            _audit(request.user, "denied", "reuse_proof_invalid_or_expired", session.id)
            return Response(
                {"detail": "La calibración guardada no es válida para esta sesión."},
                status=status.HTTP_409_CONFLICT,
            )

        calibration, created = ResearchCalibration.objects.update_or_create(
            session=session,
            defaults={
                "participant": request.user,
                "status": ResearchCalibration.STATUS_READY,
                "calibration_version": source.calibration_version,
                "execution_profile": source.execution_profile,
                "sample_counts": source.sample_counts,
                "quality": source.quality,
                "duration_ms": source.duration_ms,
                "completed_at": source.completed_at,
                "reuse_token_hash": source.reuse_token_hash,
                "valid_until": source.valid_until,
            },
        )
        _audit(request.user, "allowed", "reused" if created else "reuse_refreshed", session.id)
        return Response(
            {
                "required": settings.RESEARCH_SESSION_CALIBRATION_REQUIRED,
                "ready": True,
                "calibration_version": calibration.calibration_version,
                "minimum_samples": settings.OCULAR_CALIBRATION_MIN_SAMPLES,
                "valid_until": calibration.valid_until,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
