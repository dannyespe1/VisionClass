import math
from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import (
    ConsentEvent,
    DeviceBudgetTelemetry,
    InferredState,
    ModelArtifact,
    ResearchPseudonymMap,
)


PERIOD_DAYS = {"30d": 30, "90d": 90, "all": None}
SAFE_METRIC_KEYS = {"auroc", "auprc", "macro_f1", "brier", "ece", "coverage"}
SAFE_EVIDENCE_STATUSES = {
    "not_linked",
    "synthetic_only",
    "pending_independent_review",
    "approved_for_scope",
    "blocked",
}
OBSERVABLE_STATES = {
    InferredState.STATE_TASK_ORIENTED_EVIDENCE,
    InferredState.STATE_OFF_TASK_EVIDENCE,
}
SAFE_STATES = OBSERVABLE_STATES | {
    InferredState.STATE_NO_OBSERVABLE,
    InferredState.STATE_UNKNOWN,
}


def model_key(artifact):
    return f"{artifact.name}:{artifact.version}"


def _participant_band(count):
    if count < 40:
        return "20-39"
    if count < 80:
        return "40-79"
    return "80+"


def _research_consented_participants(participant_ids, now):
    latest = {}
    events = ConsentEvent.objects.filter(
        participant_id__in=participant_ids,
        purpose=ConsentEvent.PURPOSE_RESEARCH,
    ).order_by("participant_id", "-created_at", "-id")
    for event in events:
        latest.setdefault(event.participant_id, event)
    return {
        participant_id
        for participant_id, event in latest.items()
        if settings.CONSENT_V2_ENABLED
        and settings.CONSENT_TEXT_APPROVED
        and event.version == settings.CONSENT_CURRENT_VERSION
        and event.action == ConsentEvent.ACTION_GRANT
        and (event.expires_at is None or event.expires_at > now)
    }


def _artifact_query(scope):
    query = Q(pk__in=[])
    for scoped_key in scope:
        if ":" not in scoped_key:
            continue
        name, version = scoped_key.rsplit(":", 1)
        query |= Q(name=name, version=version)
    return ModelArtifact.objects.filter(query)


def prepare_research_inferences(grant, filters, now=None):
    now = now or timezone.now()
    artifacts = _artifact_query(grant.model_scope)
    if filters.get("model"):
        artifacts = artifacts.filter(
            name=filters["model"].rsplit(":", 1)[0],
            version=filters["model"].rsplit(":", 1)[1],
        )

    inferences = InferredState.objects.filter(
        model_artifact__in=artifacts,
        window__temporal_session__course_session__isnull=False,
        window__temporal_session__course_session__course__category__in=grant.cohort_scope,
    ).select_related(
        "model_artifact",
        "window__temporal_session__course_session__course",
        "window__temporal_session__participant",
    )
    if filters.get("cohort"):
        inferences = inferences.filter(
            window__temporal_session__course_session__course__category=filters["cohort"]
        )

    days = PERIOD_DAYS[filters["period"]]
    if days is not None:
        inferences = inferences.filter(inferred_at__gte=now - timedelta(days=days))

    profile = filters.get("profile")
    telemetry = DeviceBudgetTelemetry.objects.filter(
        profile__in=grant.profile_scope,
        expires_at__gt=now,
    )
    if profile:
        telemetry = telemetry.filter(profile=profile)
        inferences = inferences.filter(
            window__temporal_session__course_session_id__in=telemetry.values("course_session_id")
        )

    candidate_ids = set(
        inferences.values_list("window__temporal_session__participant_id", flat=True).distinct()
    )
    consented_ids = _research_consented_participants(candidate_ids, now)
    inferences = inferences.filter(window__temporal_session__participant_id__in=consented_ids)

    latest = {}
    for inference in inferences.order_by("inferred_at", "id"):
        latest[(inference.window_id, inference.model_artifact_id)] = inference
    return list(latest.values()), telemetry


def _evidence_reference(evaluation, prefix):
    status_value = evaluation.get(f"{prefix}_status", "not_linked")
    if status_value not in SAFE_EVIDENCE_STATUSES:
        status_value = "not_linked"
    reference = evaluation.get(f"{prefix}_report_reference")
    return {
        "status": status_value,
        "report_reference": str(reference)[:160] if reference else None,
    }


def _metric_subset(metrics):
    return {
        key: round(float(value), 6)
        for key, value in metrics.items()
        if key in SAFE_METRIC_KEYS and isinstance(value, (int, float)) and not isinstance(value, bool)
    }


def _bucket_distribution(samples, field):
    counts = defaultdict(int)
    for sample in samples:
        counts[getattr(sample, field)] += 1
    total = sum(counts.values())
    return {key: round(value / total, 4) for key, value in sorted(counts.items())} if total else {}


def _summarize_cell(inferences, telemetry, minimum_participants, minimum_observable_windows):
    participants = {
        inference.window.temporal_session.participant_id for inference in inferences
    }
    if len(participants) < minimum_participants:
        return None, "minimum_participants"

    counts = defaultdict(int)
    uncertainty = []
    participant_observable = defaultdict(lambda: [0, 0])
    session_ids = set()
    inference_versions = set()
    for inference in inferences:
        participant_id = inference.window.temporal_session.participant_id
        session_ids.add(inference.window.temporal_session.course_session_id)
        inference_versions.add(inference.inference_version)
        state = inference.state if inference.state in SAFE_STATES else InferredState.STATE_UNKNOWN
        counts[state] += 1
        if state in OBSERVABLE_STATES:
            participant_observable[participant_id][1] += 1
            if state == InferredState.STATE_TASK_ORIENTED_EVIDENCE:
                participant_observable[participant_id][0] += 1
            if inference.uncertainty is not None:
                uncertainty.append(inference.uncertainty)

    observable_windows = sum(counts[state] for state in OBSERVABLE_STATES)
    if len(participant_observable) < minimum_participants:
        return None, "minimum_observable_participants"
    if observable_windows < minimum_observable_windows:
        return None, "minimum_observable_windows"
    if len(uncertainty) != observable_windows:
        return None, "missing_uncertainty"

    ratios = [oriented / observable for oriented, observable in participant_observable.values()]
    mean_ratio = sum(ratios) / len(ratios)
    variance = (
        sum((value - mean_ratio) ** 2 for value in ratios) / (len(ratios) - 1)
        if len(ratios) > 1
        else 0.0
    )
    margin = 1.96 * math.sqrt(variance / len(ratios))
    total_windows = len(inferences)
    samples = list(telemetry.filter(course_session_id__in=session_ids).order_by("created_at", "id"))
    artifact = inferences[0].model_artifact
    return (
        {
            "participant_band": _participant_band(len(participants)),
            "sample": {
                "total_windows": total_windows,
                "observable_windows": observable_windows,
                "telemetry_samples": sum(sample.sample_count for sample in samples),
            },
            "quality": {
                "coverage": round(observable_windows / total_windows, 4),
                "mean_uncertainty": round(sum(uncertainty) / len(uncertainty), 4),
                "no_observable_ratio": round(
                    counts[InferredState.STATE_NO_OBSERVABLE] / total_windows, 4
                ),
                "unknown_ratio": round(counts[InferredState.STATE_UNKNOWN] / total_windows, 4),
            },
            "observable_distribution": {
                "task_oriented_evidence_ratio": round(mean_ratio, 4),
                "off_task_evidence_ratio": round(1.0 - mean_ratio, 4),
                "task_oriented_interval_95": {
                    "lower": round(max(0.0, mean_ratio - margin), 4),
                    "upper": round(min(1.0, mean_ratio + margin), 4),
                    "method": "participant_mean_normal_approximation",
                },
            },
            "resources": {
                "profiles": _bucket_distribution(samples, "profile"),
                "latency": _bucket_distribution(samples, "latency_bucket"),
                "memory": _bucket_distribution(samples, "memory_bucket"),
                "network": _bucket_distribution(samples, "network_bucket"),
                "energy": _bucket_distribution(samples, "energy_bucket"),
            },
            "registry_metrics": _metric_subset(artifact.metrics),
            "validity_evidence": _evidence_reference(artifact.evaluation, "validity"),
            "fairness_evidence": _evidence_reference(artifact.evaluation, "fairness"),
            "provenance": {
                "model_name": artifact.name,
                "model_version": artifact.version,
                "model_status": artifact.status,
                "feature_contract": artifact.feature_contract,
                "dataset_reference": artifact.dataset_reference,
                "code_revision": artifact.code_revision,
                "inference_versions": sorted(inference_versions),
                "data_contract": "temporal-v2",
            },
        },
        None,
    )


def build_research_dashboard(grant, filters, minimum_participants, minimum_observable_windows, now=None):
    inferences, telemetry = prepare_research_inferences(grant, filters, now=now)
    grouped = defaultdict(list)
    for inference in inferences:
        course = inference.window.temporal_session.course_session.course
        grouped[(course.category, inference.model_artifact_id)].append(inference)

    cells = []
    for (cohort, _artifact_id), cell_inferences in sorted(
        grouped.items(), key=lambda item: (item[0][0], model_key(item[1][0].model_artifact))
    ):
        artifact = cell_inferences[0].model_artifact
        base = {
            "cohort": cohort,
            "model": model_key(artifact),
            "profile": filters.get("profile") or "all_allowed",
        }
        summary, reason = _summarize_cell(
            cell_inferences, telemetry, minimum_participants, minimum_observable_windows
        )
        if summary is None:
            cells.append({**base, "status": "suppressed", "reason_code": reason})
        else:
            cells.append({**base, "status": "published", **summary})
    return cells, inferences


def build_pseudonymized_export_rows(
    grant,
    filters,
    minimum_participants,
    minimum_observable_windows,
    now=None,
):
    cells, inferences = build_research_dashboard(
        grant,
        filters,
        minimum_participants,
        minimum_observable_windows,
        now=now,
    )
    published = [cell for cell in cells if cell["status"] == "published"]
    if len(cells) != 1 or len(published) != 1:
        return [], "cell_not_exportable"

    participant_ids = {
        inference.window.temporal_session.participant_id for inference in inferences
    }
    pseudonyms = dict(
        ResearchPseudonymMap.objects.filter(participant_id__in=participant_ids).values_list(
            "participant_id", "research_pseudonym"
        )
    )
    grouped = defaultdict(list)
    for inference in inferences:
        participant_id = inference.window.temporal_session.participant_id
        if participant_id in pseudonyms:
            grouped[participant_id].append(inference)
    if len(grouped) < minimum_participants:
        return [], "minimum_pseudonymized_participants"

    rows = []
    total_observable = 0
    for participant_id, participant_inferences in grouped.items():
        counts = defaultdict(int)
        uncertainty = []
        versions = set()
        for inference in participant_inferences:
            state = inference.state if inference.state in SAFE_STATES else InferredState.STATE_UNKNOWN
            counts[state] += 1
            versions.add(inference.inference_version)
            if state in OBSERVABLE_STATES and inference.uncertainty is not None:
                uncertainty.append(inference.uncertainty)
        observable = sum(counts[state] for state in OBSERVABLE_STATES)
        total_observable += observable
        artifact = participant_inferences[0].model_artifact
        course = participant_inferences[0].window.temporal_session.course_session.course
        rows.append(
            {
                "research_pseudonym": str(pseudonyms[participant_id]),
                "cohort": course.category,
                "model_name": artifact.name,
                "model_version": artifact.version,
                "profile": filters["profile"],
                "period": filters["period"],
                "feature_contract": artifact.feature_contract,
                "dataset_reference": artifact.dataset_reference,
                "code_revision": artifact.code_revision,
                "inference_versions": "|".join(sorted(versions)),
                "total_windows": len(participant_inferences),
                "observable_windows": observable,
                "no_observable_windows": counts[InferredState.STATE_NO_OBSERVABLE],
                "unknown_windows": counts[InferredState.STATE_UNKNOWN],
                "task_oriented_evidence_ratio": (
                    round(counts[InferredState.STATE_TASK_ORIENTED_EVIDENCE] / observable, 4)
                    if observable
                    else ""
                ),
                "mean_uncertainty": round(sum(uncertainty) / len(uncertainty), 4)
                if uncertainty and len(uncertainty) == observable
                else "",
            }
        )
    if total_observable < minimum_observable_windows:
        return [], "minimum_observable_windows"
    return sorted(rows, key=lambda row: row["research_pseudonym"]), None
