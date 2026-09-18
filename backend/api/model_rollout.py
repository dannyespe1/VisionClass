"""Transactional model aliases, deterministic routing and auditable rollback."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import ModelAlias, ModelArtifact, ModelRolloutEvent


DEFAULT_THRESHOLDS = {
    "maximum_p95_latency_ms": 250.0,
    "maximum_error_rate": 0.02,
    "maximum_calibration_error": 0.10,
    "minimum_samples": 100,
}
RECORDED_BY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{3,64}$")
REASON_PATTERN = re.compile(r"^[A-Za-z0-9._:+-]{3,64}$")


@dataclass(frozen=True)
class RoutingDecision:
    effective_model: ModelArtifact
    shadow_model: ModelArtifact | None
    selected_role: str
    reason_code: str
    alias_revision: int


def validate_thresholds(value: dict) -> dict:
    if not isinstance(value, dict) or set(value) != set(DEFAULT_THRESHOLDS):
        raise ValidationError("Umbrales de rollout incompletos.")
    normalized = dict(value)
    for key in ("maximum_p95_latency_ms", "maximum_error_rate", "maximum_calibration_error"):
        item = normalized[key]
        if isinstance(item, bool) or not isinstance(item, (int, float)) or item < 0:
            raise ValidationError(f"Umbral inválido: {key}.")
        normalized[key] = float(item)
    if normalized["maximum_p95_latency_ms"] > 10_000:
        raise ValidationError("Latencia máxima inválida.")
    for key in ("maximum_error_rate", "maximum_calibration_error"):
        if normalized[key] > 1:
            raise ValidationError(f"Umbral inválido: {key}.")
    samples = normalized["minimum_samples"]
    if isinstance(samples, bool) or not isinstance(samples, int) or not 1 <= samples <= 1_000_000:
        raise ValidationError("Mínimo de muestras inválido.")
    return normalized


def choose_models(alias: ModelAlias, routing_key: str) -> RoutingDecision:
    if alias.mode == ModelAlias.MODE_PAUSED:
        raise RuntimeError("rollout_paused")
    if alias.mode == ModelAlias.MODE_SHADOW:
        return RoutingDecision(alias.active_model, alias.candidate_model, "active", "shadow_isolation", alias.revision)
    if alias.mode == ModelAlias.MODE_CANARY:
        digest = hashlib.sha256(
            f"{alias.environment}:{alias.name}:{routing_key}".encode("utf-8")
        ).digest()
        bucket = int.from_bytes(digest[:4], "big") % 10_000
        if bucket < alias.canary_percentage * 100:
            return RoutingDecision(alias.candidate_model, None, "candidate", "deterministic_canary", alias.revision)
    return RoutingDecision(alias.active_model, None, "active", "stable_or_canary_control", alias.revision)


def metric_violations(thresholds: dict, metrics: dict) -> list[str]:
    policy = validate_thresholds(thresholds)
    required = {"sample_count", "p95_latency_ms", "error_rate", "calibration_error"}
    if not isinstance(metrics, dict) or set(metrics) != required:
        raise ValidationError("Métricas de rollout incompletas.")
    sample_count = metrics["sample_count"]
    if isinstance(sample_count, bool) or not isinstance(sample_count, int) or sample_count < 0:
        raise ValidationError("sample_count inválido.")
    values = {}
    for key in required - {"sample_count"}:
        item = metrics[key]
        if isinstance(item, bool) or not isinstance(item, (int, float)) or item < 0:
            raise ValidationError(f"Métrica inválida: {key}.")
        values[key] = float(item)
    if values["error_rate"] > 1 or values["calibration_error"] > 1:
        raise ValidationError("Tasas fuera de rango.")
    violations = []
    if sample_count >= policy["minimum_samples"]:
        if values["p95_latency_ms"] > policy["maximum_p95_latency_ms"]:
            violations.append("latency_threshold")
        if values["error_rate"] > policy["maximum_error_rate"]:
            violations.append("error_threshold")
        if values["calibration_error"] > policy["maximum_calibration_error"]:
            violations.append("calibration_threshold")
    return violations


def _configuration(alias: ModelAlias) -> dict:
    return {
        "environment": alias.environment,
        "name": alias.name,
        "mode": alias.mode,
        "canary_percentage": alias.canary_percentage,
        "active_version": alias.active_model.version,
        "candidate_version": alias.candidate_model.version if alias.candidate_model else None,
        "previous_version": alias.previous_model.version if alias.previous_model else None,
        "thresholds": alias.thresholds,
        "revision": alias.revision,
    }


def _audit(alias, action, reason_code, recorded_by, *, from_model=None, to_model=None, metrics=None):
    if not RECORDED_BY_PATTERN.fullmatch(recorded_by):
        raise ValidationError("Identidad operativa inválida.")
    if not REASON_PATTERN.fullmatch(reason_code):
        raise ValidationError("Código de motivo inválido.")
    return ModelRolloutEvent.objects.create(
        alias=alias,
        action=action,
        from_model=from_model,
        to_model=to_model,
        reason_code=reason_code,
        metrics=metrics or {},
        configuration=_configuration(alias),
        recorded_by=recorded_by,
    )


@transaction.atomic
def create_alias(*, environment, name, active_model, recorded_by, thresholds=None):
    if active_model.status != ModelArtifact.STATUS_ACTIVE:
        raise ValidationError("El modelo estable debe estar activo.")
    alias = ModelAlias.objects.create(
        environment=environment,
        name=name,
        active_model=active_model,
        thresholds=validate_thresholds(thresholds or DEFAULT_THRESHOLDS),
    )
    _audit(alias, "alias_created", "initial_stable_model", recorded_by, to_model=active_model)
    return alias


@transaction.atomic
def start_shadow(alias_id, candidate, *, recorded_by):
    alias = ModelAlias.objects.select_for_update(of=("self",)).select_related("active_model").get(pk=alias_id)
    if candidate.status != ModelArtifact.STATUS_VALIDATED:
        raise ValidationError("El candidato debe estar validado.")
    alias.candidate_model = candidate
    alias.mode = ModelAlias.MODE_SHADOW
    alias.canary_percentage = 0
    alias.revision += 1
    alias.save()
    _audit(alias, "shadow_started", "candidate_observation", recorded_by, from_model=alias.active_model, to_model=candidate)
    return alias


@transaction.atomic
def start_canary(alias_id, percentage, *, recorded_by):
    alias = ModelAlias.objects.select_for_update(of=("self",)).select_related("active_model", "candidate_model").get(pk=alias_id)
    if not alias.candidate_model_id:
        raise ValidationError("No existe candidato para canary.")
    alias.mode = ModelAlias.MODE_CANARY
    alias.canary_percentage = percentage
    alias.revision += 1
    alias.save()
    _audit(alias, "canary_started", "approved_canary", recorded_by, from_model=alias.active_model, to_model=alias.candidate_model)
    return alias


@transaction.atomic
def promote(alias_id, metrics, *, recorded_by):
    alias = ModelAlias.objects.select_for_update(of=("self",)).select_related("active_model", "candidate_model").get(pk=alias_id)
    if alias.mode != ModelAlias.MODE_CANARY or not alias.candidate_model_id:
        raise ValidationError("La promoción requiere canary activo.")
    violations = metric_violations(alias.thresholds, metrics)
    if metrics["sample_count"] < alias.thresholds["minimum_samples"] or violations:
        raise ValidationError("Evidencia insuficiente o umbrales incumplidos.")
    previous = alias.active_model
    candidate = alias.candidate_model
    ModelArtifact.objects.filter(pk=previous.pk).update(status=ModelArtifact.STATUS_RETIRED)
    ModelArtifact.objects.filter(pk=candidate.pk).update(status=ModelArtifact.STATUS_ACTIVE)
    alias.previous_model = previous
    alias.active_model = candidate
    alias.candidate_model = None
    alias.mode = ModelAlias.MODE_STABLE
    alias.canary_percentage = 0
    alias.revision += 1
    alias.save()
    _audit(alias, "promoted", "thresholds_passed", recorded_by, from_model=previous, to_model=candidate, metrics=metrics)
    return alias


@transaction.atomic
def rollback(alias_id, *, reason_code, recorded_by, metrics=None):
    alias = ModelAlias.objects.select_for_update(of=("self",)).select_related("active_model", "candidate_model", "previous_model").get(pk=alias_id)
    from_model = alias.candidate_model or alias.active_model
    if alias.mode in {ModelAlias.MODE_SHADOW, ModelAlias.MODE_CANARY}:
        to_model = alias.active_model
        alias.candidate_model = None
    elif alias.previous_model_id:
        current = alias.active_model
        restored = alias.previous_model
        ModelArtifact.objects.filter(pk=current.pk).update(status=ModelArtifact.STATUS_RETIRED)
        ModelArtifact.objects.filter(pk=restored.pk).update(status=ModelArtifact.STATUS_ACTIVE)
        alias.active_model = restored
        alias.previous_model = current
        to_model = restored
    else:
        raise ValidationError("No existe destino de rollback.")
    alias.mode = ModelAlias.MODE_STABLE
    alias.canary_percentage = 0
    alias.revision += 1
    alias.save()
    _audit(alias, "rolled_back", reason_code, recorded_by, from_model=from_model, to_model=to_model, metrics=metrics)
    return alias


def evaluate_and_rollback(alias_id, metrics, *, recorded_by):
    alias = ModelAlias.objects.get(pk=alias_id)
    violations = metric_violations(alias.thresholds, metrics)
    if violations:
        return rollback(
            alias_id,
            reason_code="automatic_threshold_breach",
            recorded_by=recorded_by,
            metrics={**metrics, "violations": violations},
        )
    return alias
