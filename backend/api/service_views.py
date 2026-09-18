import json
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.db import DatabaseError, IntegrityError, transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .consent import has_capture_consent
from .models import AttentionEvent, Enrollment, Session
from .serializers import AttentionEventSerializer
from .service_identity import authenticate_ml_service
from .temporal_inference import (
    TemporalInferenceConflict,
    TemporalInferenceSerializer,
    inference_response,
    persist_temporal_inference,
)


logger = logging.getLogger("visionclass.security")
IDEMPOTENCY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{16,64}$")
FORBIDDEN_DATA_KEYS = {
    "audio",
    "blob",
    "content",
    "frame",
    "frame_path",
    "frames",
    "image",
    "raw_frame",
    "video",
}


def _audit(outcome: str, reason: str):
    logger.info(
        "security_event action=ml_event_write outcome=%s reason=%s",
        outcome,
        reason,
    )


def _contains_raw_media(value) -> bool:
    if isinstance(value, dict):
        return any(
            str(key).lower() in FORBIDDEN_DATA_KEYS or _contains_raw_media(child)
            for key, child in value.items()
        )
    if isinstance(value, list):
        return any(_contains_raw_media(child) for child in value)
    return False


def _validate_common_payload(request):
    if "user_id" in request.data or "user" in request.data:
        _audit("denied", "claimed_user_not_allowed")
        raise ValidationError({"user_id": "La identidad se deriva de la sesión."})
    try:
        encoded = json.dumps(request.data, separators=(",", ":"), default=str).encode("utf-8")
    except (TypeError, ValueError):
        raise ValidationError("Payload inválido.")
    if len(encoded) > getattr(settings, "ML_EVENT_MAX_BYTES", 16384):
        _audit("denied", "payload_too_large")
        raise ValidationError("Payload excede el límite permitido.")
    if _contains_raw_media(request.data.get("data", {})):
        _audit("denied", "raw_media_field_rejected")
        raise ValidationError("El evento no admite contenido visual o rutas de frames.")

    key = request.headers.get("Idempotency-Key", "").strip()
    if not IDEMPOTENCY_PATTERN.fullmatch(key):
        _audit("denied", "invalid_idempotency_key")
        raise ValidationError("Idempotency-Key inválida.")
    return key


def _validate_course_session(session: Session):
    if not getattr(settings, "STRICT_EVENT_IDENTITY", True):
        _audit("denied", "strict_identity_disabled")
        raise PermissionDenied("La validación estricta no está disponible.")
    active = Enrollment.objects.filter(
        user=session.student,
        course=session.course,
        status=Enrollment.STATUS_ACTIVE,
    ).exists()
    now = timezone.now()
    max_age = timedelta(minutes=settings.EVENT_SESSION_MAX_AGE_MINUTES)
    if (
        not active
        or not session.started_at
        or session.started_at > now
        or session.started_at < now - max_age
        or session.ended_at
    ):
        _audit("denied", "invalid_course_session")
        raise PermissionDenied("Sesión no válida.")
    return session.student


def _update_aggregate(session, event):
    frames = session.frame_count or 0
    new_count = frames + 1
    session.frame_count = new_count
    session.mean_attention = ((session.mean_attention or 0) * frames + event.value) / new_count
    session.low_attention_ratio = (
        (session.low_attention_ratio or 0) * frames + (1 if event.value < 0.4 else 0)
    ) / new_count
    session.last_score = event.value
    session.attention_score = event.value
    session.save(
        update_fields=[
            "frame_count",
            "mean_attention",
            "low_attention_ratio",
            "last_score",
            "attention_score",
        ]
    )


class MLServiceEventView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        principal = authenticate_ml_service(request, "events:write")
        idempotency_key = _validate_common_payload(request)
        course_session_id = request.data.get("session_id")
        if not course_session_id:
            raise ValidationError("session_id es obligatorio.")
        try:
            session = Session.objects.select_for_update().select_related("student", "course").get(
                pk=course_session_id
            )
        except (Session.DoesNotExist, TypeError, ValueError):
            _audit("denied", "session_not_found")
            raise PermissionDenied("Sesión no válida.")
        participant = _validate_course_session(session)
        serializer_class = AttentionEventSerializer
        model = AttentionEvent
        relation_name = "session"
        serializer_data = {**request.data, "session_id": session.id}

        if not has_capture_consent(participant):
            _audit("denied", "consent_not_valid")
            raise PermissionDenied("Consentimiento no válido.")
        if model.objects.filter(**{relation_name: session, "idempotency_key": idempotency_key}).exists():
            _audit("rejected", "event_replay")
            return Response({"detail": "El evento ya fue procesado."}, status=status.HTTP_409_CONFLICT)

        serializer = serializer_class(data=serializer_data)
        serializer.is_valid(raise_exception=True)
        try:
            event = serializer.save(user=participant, idempotency_key=idempotency_key)
        except IntegrityError:
            _audit("rejected", "event_replay")
            return Response({"detail": "El evento ya fue procesado."}, status=status.HTTP_409_CONFLICT)
        _update_aggregate(session, event)
        _audit("allowed", f"scope_events_write_{principal.key_slot}")
        return Response({"ok": True, "event_id": event.id}, status=status.HTTP_201_CREATED)


class MLTemporalInferenceView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        if not getattr(settings, "TEMPORAL_INFERENCE_API", False):
            return Response(
                {"error": {"classification": "retryable", "code": "feature_disabled"}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        principal = authenticate_ml_service(request, "temporal:write")
        try:
            encoded = json.dumps(request.data, separators=(",", ":")).encode("utf-8")
        except (TypeError, ValueError):
            encoded = b""
        if not encoded or len(encoded) > getattr(settings, "TEMPORAL_INFERENCE_MAX_BYTES", 16384):
            return Response(
                {"error": {"classification": "definitive", "code": "payload_size_invalid"}},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        if _contains_raw_media(request.data):
            return Response(
                {"error": {"classification": "definitive", "code": "raw_media_rejected"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TemporalInferenceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"classification": "definitive", "code": "invalid_contract"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = persist_temporal_inference(
                serializer.validated_data,
                service_name=principal.name,
            )
        except TemporalInferenceConflict as exc:
            return Response(
                {"error": {"classification": "definitive", "code": str(exc)}},
                status=status.HTTP_409_CONFLICT,
            )
        except ValidationError:
            return Response(
                {"error": {"classification": "definitive", "code": "window_invalid"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DatabaseError:
            return Response(
                {"error": {"classification": "retryable", "code": "persistence_unavailable"}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            inference_response(result),
            status=status.HTTP_200_OK if result.duplicate else status.HTTP_201_CREATED,
        )
