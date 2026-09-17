"""Fail-closed PR38 rule engine for optional, non-punitive student suggestions."""

import hashlib
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .consent import has_capture_consent
from .models import (
    ContentView,
    CourseMaterial,
    InferredState,
    InterventionRecord,
    TemporalSession,
    User,
)


APPROVED_VARIANTS = (
    "Si te resulta útil, puedes hacer una pausa breve y volver cuando estés listo.",
    "Puedes cambiar de postura, mirar a otro punto unos segundos y retomar a tu ritmo.",
    "Si lo prefieres, revisa el objetivo de esta sección antes de continuar. Puedes ignorar esta sugerencia.",
)


@dataclass(frozen=True)
class InterventionDecision:
    status: str
    reason_code: str
    message: str | None = None
    explanation: str | None = None
    record: InterventionRecord | None = None


def public_policy():
    return {
        "version": settings.INTERVENTION_POLICY_VERSION,
        "required_windows": settings.INTERVENTION_REQUIRED_WINDOWS,
        "maximum_uncertainty": settings.INTERVENTION_MAX_UNCERTAINTY,
        "cooldown_seconds": settings.INTERVENTION_COOLDOWN_SECONDS,
        "maximum_per_session": settings.INTERVENTION_MAX_PER_SESSION,
        "maximum_per_day": settings.INTERVENTION_MAX_PER_DAY,
        "student_only": True,
        "academic_decision": False,
        "llm_classification": False,
    }


def _verified_active_material(temporal_session):
    source = temporal_session.course_session
    current_view = (
        ContentView.objects.filter(session=source, user=temporal_session.participant, ended_at__isnull=True)
        .order_by("-started_at", "-id")
        .first()
    )
    if current_view is None or not current_view.content_id.startswith("material:"):
        return None, "learning_context_unverified"
    try:
        material_id = int(current_view.content_id.split(":", 1)[1])
    except (TypeError, ValueError):
        return None, "learning_context_unverified"
    material = (
        CourseMaterial.objects.filter(
            pk=material_id,
            lesson__module__course=source.course,
        )
        .only("id", "material_type")
        .first()
    )
    if material is None:
        return None, "learning_context_unverified"
    if material.material_type == CourseMaterial.TYPE_TEST or current_view.content_type == ContentView.TYPE_QUIZ:
        return None, "assessment_excluded"
    return material, None


def _latest_effective_inferences(temporal_session):
    allowed_models = set(settings.INTERVENTION_ALLOWED_MODEL_REFERENCES)
    if not allowed_models:
        return [], "model_allowlist_empty"
    candidates = (
        InferredState.objects.filter(
            window__temporal_session=temporal_session,
        )
        .select_related("window")
        .order_by("-window__ended_at", "-inferred_at", "-id")[: settings.INTERVENTION_REQUIRED_WINDOWS * 8]
    )
    latest = {}
    for inference in candidates:
        latest.setdefault(inference.window_id, inference)
    ordered = sorted(latest.values(), key=lambda item: (item.window.ended_at, item.id))
    evidence = ordered[-settings.INTERVENTION_REQUIRED_WINDOWS :]
    if any(item.model_reference not in allowed_models for item in evidence):
        return [], "model_not_allowlisted"
    return evidence, None


def _eligible_evidence(temporal_session, now):
    evidence, reason = _latest_effective_inferences(temporal_session)
    required = settings.INTERVENTION_REQUIRED_WINDOWS
    if reason:
        return None, reason
    if len(evidence) < required:
        return None, "insufficient_windows"
    if evidence[-1].window.ended_at > now:
        return None, "invalid_evidence_time"
    if evidence[-1].window.ended_at < now - timedelta(seconds=settings.INTERVENTION_EVIDENCE_MAX_AGE_SECONDS):
        return None, "stale_evidence"

    model_keys = {(item.model_reference, item.inference_version) for item in evidence}
    profiles = {
        (
            item.window.provenance.get("execution_profile"),
            item.window.provenance.get("profile_generation"),
        )
        for item in evidence
    }
    if len(model_keys) != 1 or any(not key[0] or not key[1] for key in model_keys):
        return None, "model_version_changed"
    if len(profiles) != 1 or any(value is None for value in next(iter(profiles), ())):
        return None, "profile_changed_or_unverified"

    previous = None
    for inference in evidence:
        window = inference.window
        duration = window.ended_at - window.started_at
        if duration < timedelta(seconds=5) or duration > timedelta(seconds=10):
            return None, "invalid_window_duration"
        if inference.inferred_at < window.ended_at or inference.inferred_at > now:
            return None, "invalid_inference_time"
        if previous:
            gap = window.started_at - previous.ended_at
            if gap < timedelta(0):
                return None, "overlapping_windows"
            if gap > timedelta(seconds=settings.INTERVENTION_MAX_WINDOW_GAP_SECONDS):
                return None, "window_gap_exceeded"
        previous = window
        if inference.state != InferredState.STATE_OFF_TASK_EVIDENCE:
            return None, "evidence_not_persistent"
        if inference.quality.get("observable") is not True:
            return None, "signal_not_explicitly_observable"
        if inference.uncertainty is None or inference.uncertainty > settings.INTERVENTION_MAX_UNCERTAINTY:
            return None, "uncertainty_too_high"
    return evidence, None


def _day_bounds(now):
    local_now = timezone.localtime(now)
    start = timezone.make_aware(datetime.combine(local_now.date(), time.min), local_now.tzinfo)
    return start, start + timedelta(days=1)


def _evidence_digest(evidence):
    material = "|".join(
        f"{item.window_id}:{item.id}:{item.model_reference}:{item.inference_version}"
        for item in evidence
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


@transaction.atomic
def evaluate_intervention(participant, course_session, now=None):
    now = now or timezone.now()
    # Serializes the daily limit even if the same account opens concurrent sessions.
    User.objects.select_for_update().get(pk=participant.pk)
    try:
        temporal = TemporalSession.objects.select_for_update().get(
            participant=participant,
            course_session=course_session,
        )
    except TemporalSession.DoesNotExist:
        return InterventionDecision("suppressed", "temporal_session_unavailable")

    if course_session.ended_at is not None:
        return InterventionDecision("suppressed", "session_ended")
    if not course_session.started_at or now - course_session.started_at < timedelta(
        seconds=settings.INTERVENTION_MIN_SESSION_SECONDS
    ):
        return InterventionDecision("suppressed", "session_warmup")
    if not has_capture_consent(participant):
        return InterventionDecision("suppressed", "consent_not_valid")
    _material, context_reason = _verified_active_material(temporal)
    if context_reason:
        return InterventionDecision("suppressed", context_reason)

    evidence, reason = _eligible_evidence(temporal, now)
    if reason:
        return InterventionDecision("suppressed", reason)
    triggering = evidence[-1]
    existing = InterventionRecord.objects.filter(
        temporal_session=temporal,
        triggering_state=triggering,
        status=InterventionRecord.STATUS_PRESENTED,
    ).first()
    if existing:
        return InterventionDecision("suppressed", "evidence_already_evaluated")

    presented = InterventionRecord.objects.filter(
        temporal_session=temporal,
        status=InterventionRecord.STATUS_PRESENTED,
    )
    if presented.count() >= settings.INTERVENTION_MAX_PER_SESSION:
        return InterventionDecision("suppressed", "session_frequency_limit")
    latest = presented.order_by("-occurred_at", "-id").first()
    if latest and latest.occurred_at > now - timedelta(seconds=settings.INTERVENTION_COOLDOWN_SECONDS):
        return InterventionDecision("suppressed", "cooldown_active")

    day_start, day_end = _day_bounds(now)
    daily_count = InterventionRecord.objects.filter(
        temporal_session__participant=participant,
        status=InterventionRecord.STATUS_PRESENTED,
        occurred_at__gte=day_start,
        occurred_at__lt=day_end,
    ).count()
    if daily_count >= settings.INTERVENTION_MAX_PER_DAY:
        return InterventionDecision("suppressed", "daily_frequency_limit")

    digest = _evidence_digest(evidence)
    variant = APPROVED_VARIANTS[int(digest[:8], 16) % len(APPROVED_VARIANTS)]
    model_reference, inference_version = next(iter({(i.model_reference, i.inference_version) for i in evidence}))
    profile, generation = next(
        iter({(i.window.provenance["execution_profile"], i.window.provenance["profile_generation"]) for i in evidence})
    )
    record = InterventionRecord.objects.create(
        temporal_session=temporal,
        triggering_state=triggering,
        intervention_type="general_optional_refocus",
        status=InterventionRecord.STATUS_PRESENTED,
        occurred_at=now,
        policy_version=settings.INTERVENTION_POLICY_VERSION,
        provenance={
            "rule": "persistent_observable_off_task_evidence",
            "evidence_digest": digest,
            "window_count": len(evidence),
            "maximum_uncertainty": settings.INTERVENTION_MAX_UNCERTAINTY,
            "model_reference": model_reference,
            "inference_version": inference_version,
            "execution_profile": profile,
            "profile_generation": generation,
            "message_variant": APPROVED_VARIANTS.index(variant),
            "llm_used": False,
            "teacher_notified": False,
            "academic_decision": False,
        },
    )
    return InterventionDecision(
        "presented",
        "persistent_observable_evidence",
        message=variant,
        explanation=(
            f"Sugerencia opcional tras {len(evidence)} ventanas observables consecutivas; "
            "no es una medición de tu atención ni una decisión académica."
        ),
        record=record,
    )
