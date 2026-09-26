"""Blind, server-timed live observation workflow for the PR31 pilot."""

from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .consent import consent_status
from .models import (
    Course,
    Enrollment,
    ObservationWindow,
    ObserverAnnotation,
    ObserverAssignment,
    ResearchAccessRequest,
    ResearchPseudonymMap,
    SecurityAuditEvent,
    TemporalSession,
    User,
)


MANUAL_VERSION = "observer-manual-v2-candidate"
SAMPLE_STRATUM = "live-rotation-v1"
AGGREGATION_VERSION = "observer-slot-v2"


class ScheduleSerializer(serializers.Serializer):
    course_id = serializers.IntegerField(min_value=1)
    participant_id = serializers.IntegerField(min_value=1)
    reviewer_id = serializers.IntegerField(min_value=1)
    request_id = serializers.UUIDField()


class AnnotationSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()
    category = serializers.ChoiceField(choices=[value for value, _ in ObserverAnnotation.CATEGORY_CHOICES])
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0)
    notes_code = serializers.CharField(required=False, allow_blank=True, max_length=64, default="")

    def validate(self, attrs):
        category = attrs["category"]
        notes_code = attrs.get("notes_code", "")
        if category == ObserverAnnotation.CATEGORY_NO_OBSERVABLE:
            if notes_code not in ObserverAnnotation.NO_OBSERVABLE_REASON_CHOICES:
                raise serializers.ValidationError({"notes_code": "Se requiere un motivo protocolizado."})
        elif notes_code:
            raise serializers.ValidationError({"notes_code": "El motivo solo corresponde a no_observable."})
        return attrs


def _enabled():
    if not settings.OBSERVER_ANNOTATION:
        raise Http404


def _audit(actor, action, outcome, reason_code, resource_id=""):
    SecurityAuditEvent.objects.create(
        actor=actor,
        action=action,
        outcome=outcome,
        reason_code=reason_code,
        resource_type="observer_assignment",
        resource_id=str(resource_id)[:64],
    )


def _active_reviewer_grant(reviewer, course=None):
    grants = ResearchAccessRequest.objects.filter(
        principal=reviewer,
        status=ResearchAccessRequest.STATUS_APPROVED,
        ethics_approval=True,
        expires_at__gt=timezone.now(),
    ).exclude(purpose="").order_by("-requested_at", "-id")
    if course is None:
        return grants.first()
    allowed_markers = {str(course.id), f"course:{course.id}"}
    return next(
        (
            grant
            for grant in grants
            if isinstance(grant.cohort_scope, list)
            and allowed_markers.intersection(str(value) for value in grant.cohort_scope)
        ),
        None,
    )


def _require_observer(user):
    if user.role == User.ROLE_TEACHER:
        return
    if user.role == User.ROLE_RESEARCHER and _active_reviewer_grant(user) is not None:
        return
    raise PermissionDenied("No autorizado para anotación independiente.")


def _research_consent_is_valid(participant):
    current = consent_status(participant)
    return bool(
        current["capture_allowed"]
        and current["purposes"]["research"]["granted"]
    )


def _target_code(participant):
    mapping, _ = ResearchPseudonymMap.objects.get_or_create(
        participant=participant,
        defaults={"research_pseudonym": uuid.uuid4()},
    )
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        mapping.research_pseudonym.bytes,
        hashlib.sha256,
    ).hexdigest()[:10].upper()
    return f"VC-{digest}"


def _assignment_status(assignment, now):
    if hasattr(assignment, "annotation"):
        return "submitted"
    if not _research_consent_is_valid(assignment.window.temporal_session.participant):
        return "consent_unavailable"
    if now < assignment.window.started_at:
        return "scheduled"
    if now < assignment.window.ended_at:
        return "observing"
    grace = timedelta(seconds=settings.OBSERVER_ANNOTATION_SUBMISSION_GRACE_SECONDS)
    if now <= assignment.window.ended_at + grace:
        return "ready"
    return "expired"


def _public_assignment(assignment, now):
    participant = assignment.window.temporal_session.participant
    return {
        "assignment_id": str(assignment.assignment_id),
        "target_code": _target_code(participant),
        "starts_at": assignment.window.started_at,
        "ends_at": assignment.window.ended_at,
        "manual_version": assignment.manual_version,
        "status": _assignment_status(assignment, now),
    }


class ObserverScheduleView(APIView):
    """Create one paired observation slot; only the course owner can schedule it."""

    def get(self, request):
        _enabled()
        if request.user.role != User.ROLE_TEACHER:
            raise PermissionDenied("Solo el profesor responsable puede preparar una ventana.")
        try:
            course_id = int(request.query_params.get("course_id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "course_id inválido."}, status=status.HTTP_400_BAD_REQUEST)
        course = Course.objects.filter(pk=course_id, owner=request.user, is_active=True).first()
        if course is None:
            raise PermissionDenied("Curso no autorizado.")
        enrollments = Enrollment.objects.filter(
            course=course,
            status=Enrollment.STATUS_ACTIVE,
            user__role=User.ROLE_STUDENT,
            user__is_active=True,
        ).select_related("user").order_by("user__last_name", "user__first_name", "user_id")
        reviewers = User.objects.filter(role=User.ROLE_RESEARCHER, is_active=True).order_by("last_name", "first_name", "id")
        return Response(
            {
                "participants": [
                    {
                        "id": item.user_id,
                        "display_name": item.user.get_full_name() or f"Estudiante {item.user_id}",
                        "active_session": TemporalSession.objects.filter(
                            participant=item.user,
                            course_session__course=course,
                            ended_at__isnull=True,
                        ).exists(),
                        "consent_ready": _research_consent_is_valid(item.user),
                    }
                    for item in enrollments
                ],
                "reviewers": [
                    {
                        "id": reviewer.id,
                        "display_name": reviewer.get_full_name() or f"Revisor {reviewer.id}",
                    }
                    for reviewer in reviewers
                    if _active_reviewer_grant(reviewer, course) is not None
                ],
                "window_seconds": settings.OBSERVER_ANNOTATION_WINDOW_SECONDS,
            }
        )

    def post(self, request):
        _enabled()
        if request.user.role != User.ROLE_TEACHER:
            raise PermissionDenied("Solo el profesor responsable puede programar una ventana.")
        payload = ScheduleSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        with transaction.atomic():
            course = Course.objects.select_for_update().filter(
                pk=data["course_id"], owner=request.user, is_active=True
            ).first()
            if course is None:
                _audit(request.user, "observer_schedule", "denied", "course_not_owned")
                raise PermissionDenied("Curso no autorizado.")
            participant = User.objects.filter(pk=data["participant_id"], role=User.ROLE_STUDENT, is_active=True).first()
            if participant is None or not Enrollment.objects.filter(
                course=course, user=participant, status=Enrollment.STATUS_ACTIVE
            ).exists():
                _audit(request.user, "observer_schedule", "denied", "participant_not_enrolled")
                raise PermissionDenied("Participante no autorizado.")
            if not _research_consent_is_valid(participant):
                _audit(request.user, "observer_schedule", "denied", "consent_unavailable")
                return Response({"detail": "Consentimiento no disponible."}, status=status.HTTP_409_CONFLICT)
            reviewer = User.objects.filter(pk=data["reviewer_id"], role=User.ROLE_RESEARCHER, is_active=True).first()
            reviewer_grant = _active_reviewer_grant(reviewer, course) if reviewer is not None else None
            if reviewer is None or reviewer_grant is None:
                _audit(request.user, "observer_schedule", "denied", "reviewer_grant_required")
                raise PermissionDenied("Segundo observador no autorizado.")
            temporal = TemporalSession.objects.select_for_update().filter(
                participant=participant,
                course_session__course=course,
                ended_at__isnull=True,
            ).order_by("-started_at", "-id").first()
            if temporal is None:
                return Response({"detail": "El participante no tiene una sesión activa."}, status=status.HTTP_409_CONFLICT)

            request_id = str(data["request_id"])
            existing = ObservationWindow.objects.filter(
                temporal_session=temporal,
                aggregation_version=AGGREGATION_VERSION,
                provenance__schedule_request_id=request_id,
            ).first()
            if existing is not None:
                assignment = existing.observer_assignments.filter(observer=request.user).first()
                if assignment is None:
                    return Response({"detail": "Conflicto de programación."}, status=status.HTTP_409_CONFLICT)
                return Response(_public_assignment(assignment, timezone.now()), status=status.HTTP_200_OK)

            starts_at = timezone.now() + timedelta(seconds=settings.OBSERVER_ANNOTATION_SCHEDULE_LEAD_SECONDS)
            ends_at = starts_at + timedelta(seconds=settings.OBSERVER_ANNOTATION_WINDOW_SECONDS)
            if ObservationWindow.objects.filter(
                temporal_session=temporal,
                aggregation_version=AGGREGATION_VERSION,
                started_at__lt=ends_at,
                ended_at__gt=starts_at,
            ).exists():
                return Response({"detail": "Ya existe una ventana solapada."}, status=status.HTTP_409_CONFLICT)
            window = ObservationWindow.objects.create(
                temporal_session=temporal,
                started_at=starts_at,
                ended_at=ends_at,
                aggregation_version=AGGREGATION_VERSION,
                features={},
                quality={},
                provenance={
                    "schedule_request_id": request_id,
                    "protocol_version": "P0.3-v0.3-candidate",
                    "manual_version": MANUAL_VERSION,
                    "raw_media_stored": False,
                    "reviewer_grant_id": reviewer_grant.id,
                },
            )
            assignments = []
            for observer in (request.user, reviewer):
                assignment = ObserverAssignment(
                    assignment_id=uuid.uuid4(),
                    window=window,
                    observer=observer,
                    manual_version=MANUAL_VERSION,
                    sample_stratum=SAMPLE_STRATUM,
                )
                assignment.full_clean()
                assignment.save()
                assignments.append(assignment)
            _audit(request.user, "observer_schedule", "allowed", "paired_window_created", assignments[0].assignment_id)
            return Response(_public_assignment(assignments[0], timezone.now()), status=status.HTTP_201_CREATED)


class ObserverAssignmentView(APIView):
    def get(self, request):
        _enabled()
        _require_observer(request.user)
        now = timezone.now()
        horizon = now - timedelta(seconds=settings.OBSERVER_ANNOTATION_SUBMISSION_GRACE_SECONDS)
        assignments = ObserverAssignment.objects.filter(
            observer=request.user,
            window__ended_at__gte=horizon,
        ).select_related("window__temporal_session__participant").order_by("window__started_at", "id")[:30]
        return Response({"assignments": [_public_assignment(item, now) for item in assignments]})

    def post(self, request):
        _enabled()
        _require_observer(request.user)
        payload = AnnotationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        now = timezone.now()
        try:
            with transaction.atomic():
                assignment = ObserverAssignment.objects.select_for_update().select_related(
                    "window__temporal_session__participant"
                ).get(assignment_id=data["assignment_id"], observer=request.user)
                if hasattr(assignment, "annotation"):
                    return Response({"detail": "La anotación ya fue registrada."}, status=status.HTTP_409_CONFLICT)
                if not _research_consent_is_valid(assignment.window.temporal_session.participant):
                    _audit(request.user, "observer_annotation", "denied", "consent_unavailable", assignment.assignment_id)
                    return Response({"detail": "Consentimiento no disponible."}, status=status.HTTP_409_CONFLICT)
                if request.user.role == User.ROLE_RESEARCHER:
                    course = assignment.window.temporal_session.course_session.course
                    grant = _active_reviewer_grant(request.user, course)
                    expected_grant_id = assignment.window.provenance.get("reviewer_grant_id")
                    if grant is None or grant.id != expected_grant_id:
                        _audit(request.user, "observer_annotation", "denied", "scoped_grant_required", assignment.assignment_id)
                        raise PermissionDenied("El permiso de revisión ya no cubre esta cohorte.")
                if now < assignment.window.ended_at:
                    return Response(
                        {"detail": "La ventana de observación todavía no finaliza."},
                        status=status.HTTP_409_CONFLICT,
                    )
                deadline = assignment.window.ended_at + timedelta(
                    seconds=settings.OBSERVER_ANNOTATION_SUBMISSION_GRACE_SECONDS
                )
                if now > deadline:
                    return Response({"detail": "La ventana de envío expiró."}, status=status.HTTP_410_GONE)
                annotation = ObserverAnnotation(
                    assignment=assignment,
                    category=data["category"],
                    confidence=data["confidence"],
                    notes_code=data.get("notes_code", ""),
                    completed_at=now,
                )
                annotation.full_clean()
                annotation.save()
                submitted = ObserverAnnotation.objects.filter(assignment__window=assignment.window).count()
                _audit(request.user, "observer_annotation", "allowed", "immutable_annotation_created", assignment.assignment_id)
        except ObserverAssignment.DoesNotExist:
            _audit(request.user, "observer_annotation", "denied", "assignment_not_owned")
            raise PermissionDenied("Asignación no autorizada.")
        except IntegrityError:
            return Response({"detail": "La anotación ya fue registrada."}, status=status.HTTP_409_CONFLICT)
        return Response(
            {"status": "accepted", "pair_status": "complete" if submitted >= 2 else "waiting_for_peer"},
            status=status.HTTP_201_CREATED,
        )
