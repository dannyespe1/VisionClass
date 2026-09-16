"""Versioned, bounded temporal inference contract for PR21."""

from __future__ import annotations

import json
from pathlib import Path
from time import perf_counter
from typing import Any, Callable, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

try:
    from ml.state_model import STATE_NAMES, StateModelArtifact, StateModelConfig, smooth_sequence
except ImportError:  # Supports `python ml_service.py` inside the image.
    from state_model import STATE_NAMES, StateModelArtifact, StateModelConfig, smooth_sequence


CONTRACT_VERSION = "1.0"
INTERPRETATION = "observable_evidence_not_internal_attention"


class TemporalInferenceError(Exception):
    def __init__(self, code: str, *, retryable: bool, status_code: int):
        super().__init__(code)
        self.code = code
        self.retryable = retryable
        self.status_code = status_code

    @property
    def classification(self) -> str:
        return "retryable" if self.retryable else "definitive"


class TemporalEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp_ms: int = Field(ge=0)
    observable: bool
    probability: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_observation(self):
        if self.observable and self.probability is None:
            raise ValueError("observable_event_requires_probability")
        if not self.observable and self.probability is not None:
            raise ValueError("no_observable_must_not_carry_probability")
        return self


class TemporalInferenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_version: Literal["1.0"]
    inference_id: UUID
    window_id: int = Field(ge=1)
    model_id: str = Field(min_length=3, max_length=128, pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]+$")
    events: list[TemporalEvent] = Field(min_length=1, max_length=128)


def load_state_artifact(path: str | Path) -> StateModelArtifact:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    value = payload.get("artifact", payload)
    if tuple(value["state_names"]) != STATE_NAMES:
        raise ValueError("unsupported_state_ontology")
    config = StateModelConfig(**value["config"])
    return StateModelArtifact(
        artifact_version=value["artifact_version"],
        state_names=tuple(value["state_names"]),
        initial=tuple(value["initial"]),
        transition=tuple(tuple(row) for row in value["transition"]),
        emission_mean=tuple(value["emission_mean"]),
        emission_variance=tuple(value["emission_variance"]),
        config=config,
    )


class TemporalInferenceEngine:
    def __init__(
        self,
        artifact: StateModelArtifact,
        *,
        max_events: int = 128,
        timeout_ms: int = 250,
        clock: Callable[[], float] = perf_counter,
    ):
        if not 1 <= max_events <= 128:
            raise ValueError("invalid_max_events")
        if not 1 <= timeout_ms <= 10_000:
            raise ValueError("invalid_timeout_ms")
        self.artifact = artifact
        self.max_events = max_events
        self.timeout_ms = timeout_ms
        self.clock = clock

    def infer(self, request: TemporalInferenceRequest) -> dict[str, Any]:
        if request.model_id != self.artifact.artifact_version:
            raise TemporalInferenceError(
                "unsupported_model_id", retryable=False, status_code=422
            )
        if len(request.events) > self.max_events:
            raise TemporalInferenceError(
                "window_too_large", retryable=False, status_code=413
            )
        started = self.clock()
        try:
            outputs = smooth_sequence(
                [event.model_dump() for event in request.events], self.artifact
            )
        except ValueError as exc:
            raise TemporalInferenceError(
                str(exc), retryable=False, status_code=422
            ) from exc
        elapsed_ms = (self.clock() - started) * 1000
        if elapsed_ms > self.timeout_ms:
            raise TemporalInferenceError(
                "inference_timeout", retryable=True, status_code=503
            )
        result = outputs[-1]
        observable_count = sum(event.observable for event in request.events)
        observable = result["evidence_state"] != "no_observable"
        return {
            "contract_version": CONTRACT_VERSION,
            "inference_id": str(request.inference_id),
            "window_id": request.window_id,
            "model_id": self.artifact.artifact_version,
            "inference_version": self.artifact.artifact_version,
            "state": result["evidence_state"],
            "probabilities": result["posterior"],
            "uncertainty": result["uncertainty"],
            "quality": {
                "observable": observable,
                "confidence": (1.0 - result["uncertainty"]) if observable else None,
                "reason": None if observable else "insufficient_signal",
                "sample_count": observable_count,
            },
            "allow_intervention": False,
            "interpretation": INTERPRETATION,
        }
