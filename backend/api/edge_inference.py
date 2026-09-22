"""Minimal, consent-bound ingestion for strict browser-side Edge inference."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .models import InferredState, ModelArtifact, ObservationWindow, Session, TemporalSession


CONTRACT_VERSION = "edge-shadow-inference-v2"
INFERENCE_VERSION = "masked-gru-browser-v2"
MODEL_NAME = "masked-gru-observable-evidence"
OUTPUT_STATES = {
    InferredState.STATE_NO_OBSERVABLE,
    InferredState.STATE_OFF_TASK_EVIDENCE,
    InferredState.STATE_TASK_ORIENTED_EVIDENCE,
}


class EdgeShadowInferenceSerializer(serializers.Serializer):
    contract_version = serializers.ChoiceField(choices=[CONTRACT_VERSION])
    inference_id = serializers.UUIDField()
    session_id = serializers.IntegerField(min_value=1)
    captured_at = serializers.DateTimeField()
    window_duration_ms = serializers.IntegerField(min_value=1000, max_value=30_000)
    execution_profile = serializers.ChoiceField(choices=["low", "balanced", "high"])
    profile_generation = serializers.IntegerField(min_value=0, max_value=1_000_000)
    quality = serializers.DictField()
    model_version = serializers.RegexField(r"^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$")
    artifact_sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")
    state = serializers.ChoiceField(choices=sorted(OUTPUT_STATES))
    probability = serializers.FloatField(min_value=0.0, max_value=1.0, allow_null=True)
    mode = serializers.ChoiceField(choices=["shadow_only"])
    allow_intervention = serializers.BooleanField()
    interpretation = serializers.ChoiceField(
        choices=["observable_evidence_not_internal_attention"]
    )
    execution_location = serializers.ChoiceField(choices=["local_device"])

    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError(
                {"non_field_errors": ["El reporte contiene campos no permitidos."]}
            )
        return super().to_internal_value(data)

    def validate_quality(self, value):
        allowed = {"observable", "confidence", "reason", "sample_count"}
        if not isinstance(value, dict) or set(value) != allowed:
            raise serializers.ValidationError("Resumen de calidad inválido.")
        if not isinstance(value["observable"], bool):
            raise serializers.ValidationError("Observable debe ser booleano.")
        confidence = value["confidence"]
        if confidence is not None and (
            isinstance(confidence, bool)
            or not isinstance(confidence, (int, float))
            or not 0 <= confidence <= 1
        ):
            raise serializers.ValidationError("Confianza inválida.")
        reason = value["reason"]
        if reason is not None and (not isinstance(reason, str) or len(reason) > 64):
            raise serializers.ValidationError("Razón de calidad inválida.")
        sample_count = value["sample_count"]
        if (
            isinstance(sample_count, bool)
            or not isinstance(sample_count, int)
            or not 1 <= sample_count <= 128
        ):
            raise serializers.ValidationError("Cantidad de muestras inválida.")
        return value

    def validate(self, attrs):
        if attrs["allow_intervention"] is not False:
            raise serializers.ValidationError(
                {"allow_intervention": "El modelo Edge en shadow no permite intervenciones."}
            )
        observable = attrs["quality"]["observable"]
        if not observable:
            if attrs["state"] != InferredState.STATE_NO_OBSERVABLE:
                raise serializers.ValidationError(
                    {"state": "Una ventana no observable debe conservar ese estado."}
                )
            if attrs["probability"] is not None:
                raise serializers.ValidationError(
                    {"probability": "Una ventana no observable no admite probabilidad."}
                )
        elif attrs["state"] == InferredState.STATE_NO_OBSERVABLE or attrs["probability"] is None:
            raise serializers.ValidationError(
                {"state": "Una ventana observable requiere estado y probabilidad."}
            )
        return attrs


class EdgeInferenceConflict(Exception):
    pass


@dataclass(frozen=True)
class EdgePersistenceResult:
    inference: InferredState
    duplicate: bool


def _artifact_for(validated):
    try:
        artifact = ModelArtifact.objects.get(
            name=MODEL_NAME,
            version=validated["model_version"],
            artifact_sha256=validated["artifact_sha256"],
        )
    except ModelArtifact.DoesNotExist as exc:
        raise serializers.ValidationError(
            {"model_version": "El artefacto canónico no está registrado."}
        ) from exc
    if artifact.status not in {
        ModelArtifact.STATUS_CANDIDATE,
        ModelArtifact.STATUS_VALIDATED,
        ModelArtifact.STATUS_ACTIVE,
    }:
        raise serializers.ValidationError(
            {"model_version": "El artefacto no admite ejecución shadow."}
        )
    return artifact


def _canonical_state(artifact, probability, observable):
    if not observable:
        return InferredState.STATE_NO_OBSERVABLE
    threshold = artifact.thresholds.get("task_oriented_evidence")
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
        raise serializers.ValidationError(
            {"model_version": "El artefacto no tiene un umbral canónico válido."}
        )
    return (
        InferredState.STATE_TASK_ORIENTED_EVIDENCE
        if probability >= threshold
        else InferredState.STATE_OFF_TASK_EVIDENCE
    )


@transaction.atomic
def persist_edge_shadow_inference(validated, *, participant, source: Session):
    artifact = _artifact_for(validated)
    captured_at = validated["captured_at"]
    now = timezone.now()
    if captured_at > now + timedelta(seconds=5) or captured_at < source.started_at:
        raise serializers.ValidationError({"captured_at": "Fecha de captura inválida."})

    temporal, _ = TemporalSession.objects.get_or_create(
        course_session=source,
        defaults={
            "participant": participant,
            "started_at": source.started_at or captured_at,
            "provenance": {"source": "strict_edge_shadow_v2"},
        },
    )
    temporal = TemporalSession.objects.select_for_update().get(pk=temporal.pk)
    if temporal.participant_id != participant.pk:
        raise serializers.ValidationError({"session_id": "Sesión temporal inconsistente."})

    observable = validated["quality"]["observable"]
    expected_state = _canonical_state(artifact, validated["probability"], observable)
    if validated["state"] != expected_state:
        raise serializers.ValidationError(
            {"state": "El estado no coincide con la calidad y el umbral canónico."}
        )

    existing = InferredState.objects.filter(inference_id=validated["inference_id"]).first()
    if existing:
        if (
            existing.window.temporal_session_id == temporal.pk
            and existing.model_artifact_id == artifact.pk
            and existing.state == expected_state
            and existing.provenance.get("client_probability") == validated["probability"]
            and existing.window.ended_at == captured_at
        ):
            return EdgePersistenceResult(existing, True)
        raise EdgeInferenceConflict("inference_id_conflict")

    minimum_interval = timedelta(seconds=settings.EDGE_SHADOW_REPORT_MIN_INTERVAL_SECONDS)
    recent = InferredState.objects.filter(
        window__temporal_session=temporal,
        model_artifact=artifact,
        provenance__source="strict_edge_shadow_inference",
        window__ended_at__gt=captured_at - minimum_interval,
    ).exists()
    if recent:
        raise EdgeInferenceConflict("report_interval_not_elapsed")

    quality = dict(validated["quality"])
    probability = validated["probability"]
    probabilities = (
        {
            InferredState.STATE_OFF_TASK_EVIDENCE: round(1.0 - probability, 10),
            InferredState.STATE_TASK_ORIENTED_EVIDENCE: round(probability, 10),
        }
        if observable
        else {}
    )
    uncertainty = round(1.0 - abs((2.0 * probability) - 1.0), 10) if observable else None
    provenance = {
        "source": "strict_edge_shadow_inference",
        "contract_version": CONTRACT_VERSION,
        "interpretation": validated["interpretation"],
        "allow_intervention": False,
        "execution_location": "local_device",
        "execution_profile": validated["execution_profile"],
        "profile_generation": validated["profile_generation"],
        "artifact_integrity": "sha256_verified_by_client_and_registry_matched",
        "client_probability": probability,
        "raw_media_transmitted": False,
        "normalized_features_transmitted": False,
    }
    window = ObservationWindow.objects.create(
        temporal_session=temporal,
        started_at=captured_at - timedelta(milliseconds=validated["window_duration_ms"]),
        ended_at=captured_at,
        aggregation_version="strict-edge-shadow-window-v2",
        features={},
        quality=quality,
        provenance=provenance,
    )
    try:
        inference = InferredState.objects.create(
            window=window,
            inference_id=validated["inference_id"],
            state=expected_state,
            probabilities=probabilities,
            uncertainty=uncertainty,
            quality=quality,
            model_reference=f"{artifact.name}:{artifact.version}",
            model_artifact=artifact,
            inference_version=INFERENCE_VERSION,
            inferred_at=max(now, captured_at),
            provenance=provenance,
        )
    except IntegrityError as exc:
        raise EdgeInferenceConflict("concurrent_inference_conflict") from exc
    return EdgePersistenceResult(inference, False)


def edge_inference_response(result):
    inference = result.inference
    return {
        "contract_version": CONTRACT_VERSION,
        "inference_id": str(inference.inference_id),
        "window_id": inference.window_id,
        "state": inference.state,
        "model": inference.model_reference,
        "inference_version": inference.inference_version,
        "duplicate": result.duplicate,
        "allow_intervention": False,
    }
