import hashlib
import hmac
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import (
    AttentionEvent, DemographicVaultRecord, D2RAttentionEvent, InferredState,
    InterventionRecord, LearningInteractionEvent, MomentarySelfReport, Observation,
    ObservationWindow, ObserverAnnotation, ObserverAssignment, ResearchPseudonymMap,
    RetentionRun, StateTransition, TemporalSession,
)


def _subject_digest(participant_id):
    secret = settings.RETENTION_AUDIT_SECRET
    if len(secret) < 32:
        raise ValueError("RETENTION_AUDIT_SECRET must contain at least 32 characters")
    return hmac.new(secret.encode(), str(participant_id).encode(), hashlib.sha256).hexdigest()


def _counts_for(participant):
    temporal = TemporalSession.objects.filter(participant=participant)
    windows = ObservationWindow.objects.filter(temporal_session__in=temporal)
    assignments = ObserverAssignment.objects.filter(window__in=windows)
    mapping = ResearchPseudonymMap.objects.filter(participant=participant).first()
    return {
        "observer_annotations": ObserverAnnotation.objects.filter(assignment__in=assignments).count(),
        "observer_assignments": assignments.count(),
        "self_reports": MomentarySelfReport.objects.filter(temporal_session__in=temporal).count(),
        "learning_events": LearningInteractionEvent.objects.filter(temporal_session__in=temporal).count(),
        "transitions": StateTransition.objects.filter(temporal_session__in=temporal).count(),
        "interventions": InterventionRecord.objects.filter(temporal_session__in=temporal).count(),
        "inferred_states": InferredState.objects.filter(window__in=windows).count(),
        "observations": Observation.objects.filter(temporal_session__in=temporal).count(),
        "windows": windows.count(),
        "temporal_sessions": temporal.count(),
        "legacy_attention_events": AttentionEvent.objects.filter(user=participant).count(),
        "legacy_d2r_events": D2RAttentionEvent.objects.filter(user=participant).count(),
        "vault_records": int(bool(mapping and DemographicVaultRecord.objects.filter(research_pseudonym=mapping.research_pseudonym).exists())),
        "pseudonym_maps": int(mapping is not None),
    }


@transaction.atomic
def delete_participant_derived(participant, redis_client=None, execute=False):
    digest = _subject_digest(participant.pk)
    counts = _counts_for(participant)
    run = RetentionRun.objects.create(run_id=uuid.uuid4(), operation="participant_derived_delete", subject_digest=digest, status=RetentionRun.STATUS_PLANNED, counts=counts, started_at=timezone.now())
    if not execute:
        return run
    temporal = TemporalSession.objects.filter(participant=participant)
    windows = ObservationWindow.objects.filter(temporal_session__in=temporal)
    assignments = ObserverAssignment.objects.filter(window__in=windows)
    ObserverAnnotation.objects.filter(assignment__in=assignments).delete()
    assignments.delete()
    MomentarySelfReport.objects.filter(temporal_session__in=temporal).delete()
    LearningInteractionEvent.objects.filter(temporal_session__in=temporal).delete()
    StateTransition.objects.filter(temporal_session__in=temporal).delete()
    InterventionRecord.objects.filter(temporal_session__in=temporal).delete()
    InferredState.objects.filter(window__in=windows).delete()
    Observation.objects.filter(temporal_session__in=temporal).delete()
    windows.delete()
    temporal.delete()
    AttentionEvent.objects.filter(user=participant).delete()
    D2RAttentionEvent.objects.filter(user=participant).delete()
    mapping = ResearchPseudonymMap.objects.filter(participant=participant).first()
    if mapping:
        DemographicVaultRecord.objects.filter(research_pseudonym=mapping.research_pseudonym).delete()
        mapping.delete()
    if redis_client is not None:
        redis_client.xadd(f"{settings.REDIS_NAMESPACE}:retention", {"subject_digest": digest, "action": "delete"}, maxlen=10000, approximate=True)
    run.status = RetentionRun.STATUS_COMPLETED
    run.completed_at = timezone.now()
    run.save(update_fields=["status", "completed_at"])
    return run


@transaction.atomic
def expire_due(now=None, execute=False):
    now = now or timezone.now()
    querysets = {
        "vault_records": DemographicVaultRecord.objects.filter(retention_until__lt=now),
        "learning_events": LearningInteractionEvent.objects.filter(occurred_at__lt=now - timedelta(days=settings.TELEMETRY_RETENTION_DAYS)),
        "self_reports": MomentarySelfReport.objects.filter(requested_at__lt=now - timedelta(days=settings.STATE_RETENTION_DAYS)),
        "observations": Observation.objects.filter(captured_at__lt=now - timedelta(days=settings.OBSERVATION_RETENTION_DAYS)),
    }
    counts = {name: queryset.count() for name, queryset in querysets.items()}
    run = RetentionRun.objects.create(run_id=uuid.uuid4(), operation="scheduled_expiry", status=RetentionRun.STATUS_PLANNED, counts=counts, started_at=now)
    if execute:
        for queryset in querysets.values():
            queryset.delete()
        run.status = RetentionRun.STATUS_COMPLETED
        run.completed_at = timezone.now()
        run.save(update_fields=["status", "completed_at"])
    return run
