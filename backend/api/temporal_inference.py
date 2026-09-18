"""Stable PR21 contract and idempotent persistence for temporal inference."""

from __future__ import annotations

from dataclasses import dataclass

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .models import InferredState, ModelAlias, ObservationWindow
from .stream_pipeline import DefinitiveStreamError


CONTRACT_VERSION = "1.0"
INFERENCE_VERSION = "observable-evidence-hmm-v1"
MODEL_ID_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$"
POSTERIOR_STATES = {"off_task_evidence", "task_oriented_evidence"}
OUTPUT_STATES = POSTERIOR_STATES | {"no_observable"}


class TemporalInferenceSerializer(serializers.Serializer):
    contract_version = serializers.ChoiceField(choices=[CONTRACT_VERSION])
    inference_id = serializers.UUIDField()
    window_id = serializers.IntegerField(min_value=1)
    model_id = serializers.RegexField(MODEL_ID_PATTERN, max_length=128)
    inference_version = serializers.ChoiceField(choices=[INFERENCE_VERSION])
    state = serializers.ChoiceField(choices=sorted(OUTPUT_STATES))
    probabilities = serializers.DictField(
        child=serializers.FloatField(min_value=0.0, max_value=1.0)
    )
    uncertainty = serializers.FloatField(min_value=0.0, max_value=1.0)
    quality = serializers.DictField()
    allow_intervention = serializers.BooleanField()
    interpretation = serializers.ChoiceField(
        choices=["observable_evidence_not_internal_attention"]
    )
    rollout = serializers.DictField(required=False)

    def validate_probabilities(self, value):
        if set(value) != POSTERIOR_STATES:
            raise serializers.ValidationError("Estados posteriores inválidos.")
        if abs(sum(value.values()) - 1.0) > 1e-6:
            raise serializers.ValidationError("Las probabilidades deben sumar uno.")
        return value

    def validate_quality(self, value):
        allowed = {"observable", "confidence", "reason", "sample_count"}
        if set(value) - allowed or not isinstance(value.get("observable"), bool):
            raise serializers.ValidationError("Calidad inválida.")
        confidence = value.get("confidence")
        if confidence is not None and (
            isinstance(confidence, bool)
            or not isinstance(confidence, (int, float))
            or not 0 <= confidence <= 1
        ):
            raise serializers.ValidationError("Confianza inválida.")
        sample_count = value.get("sample_count")
        if sample_count is not None and (
            isinstance(sample_count, bool)
            or not isinstance(sample_count, int)
            or not 0 <= sample_count <= 128
        ):
            raise serializers.ValidationError("Cantidad de muestras inválida.")
        reason = value.get("reason")
        if reason is not None and (not isinstance(reason, str) or len(reason) > 64):
            raise serializers.ValidationError("Razón de calidad inválida.")
        return value

    def validate_rollout(self, value):
        required = {
            "environment", "alias", "mode", "revision", "active_model_id",
            "candidate_model_id", "effective_model_id", "selected_role",
            "selection_reason", "active_latency_ms", "candidate_latency_ms",
            "candidate_error", "outputs_agree",
        }
        if not isinstance(value, dict) or set(value) != required:
            raise serializers.ValidationError("Telemetría de rollout inválida.")
        if value["mode"] not in {"stable", "shadow", "canary"}:
            raise serializers.ValidationError("Modo de rollout inválido.")
        if value["selected_role"] not in {"active", "candidate"}:
            raise serializers.ValidationError("Rol efectivo inválido.")
        if not isinstance(value["revision"], int) or value["revision"] < 1:
            raise serializers.ValidationError("Revisión inválida.")
        for key in ("active_latency_ms", "candidate_latency_ms"):
            item = value[key]
            if item is not None and (
                isinstance(item, bool) or not isinstance(item, (int, float)) or not 0 <= item <= 10_000
            ):
                raise serializers.ValidationError("Latencia inválida.")
        if not isinstance(value["candidate_error"], bool):
            raise serializers.ValidationError("Indicador de error inválido.")
        if value["outputs_agree"] is not None and not isinstance(value["outputs_agree"], bool):
            raise serializers.ValidationError("Comparación inválida.")
        for key in ("environment", "alias", "active_model_id", "effective_model_id", "selection_reason"):
            if not isinstance(value[key], str) or not 1 <= len(value[key]) <= 128:
                raise serializers.ValidationError("Identificador de rollout inválido.")
        if value["candidate_model_id"] is not None and not isinstance(value["candidate_model_id"], str):
            raise serializers.ValidationError("Candidato inválido.")
        return value

    def validate(self, attrs):
        if attrs["allow_intervention"] is not False:
            raise serializers.ValidationError(
                {"allow_intervention": "PR21 no permite intervenciones."}
            )
        if attrs["quality"]["observable"] is False and attrs["state"] != "no_observable":
            raise serializers.ValidationError(
                {"state": "Una ventana no observable debe conservar ese estado."}
            )
        if attrs["quality"]["observable"] is True and attrs["state"] == "no_observable":
            raise serializers.ValidationError(
                {"state": "Una ventana observable no puede marcarse no observable."}
            )
        return attrs


@dataclass(frozen=True)
class PersistenceResult:
    inference: InferredState
    duplicate: bool


class TemporalInferenceConflict(Exception):
    pass


@transaction.atomic
def persist_temporal_inference(validated: dict, *, service_name: str) -> PersistenceResult:
    """Persist once; callable by the internal endpoint or a Streams handler."""
    try:
        window = ObservationWindow.objects.select_for_update().get(
            pk=validated["window_id"]
        )
    except ObservationWindow.DoesNotExist as exc:
        raise serializers.ValidationError({"window_id": "Ventana no encontrada."}) from exc

    identity = {
        "window": window,
        "model_reference": validated["model_id"],
        "inference_version": validated["inference_version"],
    }
    rollout = validated.get("rollout")
    effective_artifact = None
    if rollout:
        try:
            alias = ModelAlias.objects.select_for_update(of=("self",)).select_related(
                "active_model", "candidate_model"
            ).get(environment=rollout["environment"], name=rollout["alias"])
        except ModelAlias.DoesNotExist as exc:
            raise serializers.ValidationError("Alias de modelo no encontrado.") from exc
        if alias.revision != rollout["revision"]:
            raise serializers.ValidationError("Revisión de alias obsoleta.")
        allowed = {alias.active_model.version}
        if alias.candidate_model:
            allowed.add(alias.candidate_model.version)
        if (
            rollout["mode"] != alias.mode
            or
            rollout["effective_model_id"] != validated["model_id"]
            or validated["model_id"] not in allowed
            or rollout["active_model_id"] != alias.active_model.version
            or rollout["candidate_model_id"] != (
                alias.candidate_model.version if alias.candidate_model else None
            )
        ):
            raise serializers.ValidationError("Selección de modelo inconsistente.")
        if (
            (rollout["selected_role"] == "active" and validated["model_id"] != alias.active_model.version)
            or (
                rollout["selected_role"] == "candidate"
                and (not alias.candidate_model or validated["model_id"] != alias.candidate_model.version)
            )
        ):
            raise serializers.ValidationError("Rol de rollout inconsistente.")
        if alias.mode == ModelAlias.MODE_SHADOW and validated["model_id"] != alias.active_model.version:
            raise serializers.ValidationError("Shadow no puede producir la salida efectiva.")
        effective_artifact = (
            alias.active_model
            if validated["model_id"] == alias.active_model.version
            else alias.candidate_model
        )
    existing_by_id = InferredState.objects.filter(
        inference_id=validated["inference_id"]
    ).first()
    if existing_by_id:
        if (
            existing_by_id.window_id == window.pk
            and existing_by_id.model_reference == validated["model_id"]
            and existing_by_id.inference_version == validated["inference_version"]
            and existing_by_id.state == validated["state"]
            and existing_by_id.probabilities == validated["probabilities"]
            and existing_by_id.uncertainty == validated["uncertainty"]
            and existing_by_id.quality == validated["quality"]
            and existing_by_id.provenance.get("rollout") == rollout
        ):
            return PersistenceResult(existing_by_id, True)
        raise TemporalInferenceConflict("inference_id_conflict")

    existing_effective = InferredState.objects.filter(**identity).first()
    if existing_effective:
        raise TemporalInferenceConflict("window_model_already_inferred")

    try:
        inference = InferredState.objects.create(
            **identity,
            inference_id=validated["inference_id"],
            state=validated["state"],
            probabilities=validated["probabilities"],
            uncertainty=validated["uncertainty"],
            quality=validated["quality"],
            model_artifact=effective_artifact,
            inferred_at=timezone.now(),
            provenance={
                "contract_version": validated["contract_version"],
                "source": "internal_temporal_inference",
                "service": service_name,
                "interpretation": validated["interpretation"],
                "allow_intervention": False,
                "rollout": rollout,
            },
        )
    except IntegrityError as exc:
        raise TemporalInferenceConflict("concurrent_inference_conflict") from exc
    return PersistenceResult(inference, False)


def inference_response(result: PersistenceResult) -> dict:
    inference = result.inference
    response = {
        "contract_version": CONTRACT_VERSION,
        "inference_id": str(inference.inference_id),
        "window_id": inference.window_id,
        "state": inference.state,
        "probabilities": inference.probabilities,
        "uncertainty": inference.uncertainty,
        "quality": inference.quality,
        "model_id": inference.model_reference,
        "inference_version": inference.inference_version,
        "duplicate": result.duplicate,
        "allow_intervention": False,
        "interpretation": "observable_evidence_not_internal_attention",
    }
    if inference.provenance.get("rollout"):
        response["rollout"] = inference.provenance["rollout"]
    return response


def process_temporal_stream_event(payload: dict, *, service_name: str = "stream-consumer") -> PersistenceResult:
    """Validate a PR13 envelope and persist a PR21 inference."""
    if payload.get("event_type") != "temporal_inference":
        raise DefinitiveStreamError("unsupported_event_type")
    serializer = TemporalInferenceSerializer(data=payload.get("data"))
    if not serializer.is_valid():
        raise DefinitiveStreamError("invalid_temporal_inference_contract")
    try:
        return persist_temporal_inference(
            serializer.validated_data,
            service_name=service_name,
        )
    except (TemporalInferenceConflict, serializers.ValidationError) as exc:
        raise DefinitiveStreamError(type(exc).__name__) from exc
