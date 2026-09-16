"""Safe active/shadow/canary orchestration without shadow output leakage."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from time import perf_counter
from typing import Callable

try:
    from ml.temporal_api import TemporalInferenceEngine, TemporalInferenceRequest
except ImportError:  # Supports `python ml_service.py` inside the image.
    from temporal_api import TemporalInferenceEngine, TemporalInferenceRequest


@dataclass(frozen=True)
class RolloutConfig:
    environment: str
    alias: str
    mode: str = "stable"
    canary_percentage: int = 0
    revision: int = 1

    def validate(self):
        if self.mode not in {"stable", "shadow", "canary"}:
            raise ValueError("invalid_rollout_mode")
        if self.mode == "canary" and not 1 <= self.canary_percentage <= 50:
            raise ValueError("invalid_canary_percentage")
        if self.mode != "canary" and self.canary_percentage != 0:
            raise ValueError("unexpected_canary_percentage")
        if not self.environment or not self.alias or self.revision < 1:
            raise ValueError("invalid_rollout_identity")


class RolloutCoordinator:
    def __init__(self, active_engine, candidate_engine, config: RolloutConfig, *, clock: Callable[[], float] = perf_counter):
        config.validate()
        if config.mode in {"shadow", "canary"} and candidate_engine is None:
            raise ValueError("candidate_required")
        self.active_engine: TemporalInferenceEngine = active_engine
        self.candidate_engine: TemporalInferenceEngine | None = candidate_engine
        self.config = config
        self.clock = clock

    def _candidate_selected(self, routing_key: str) -> bool:
        digest = hashlib.sha256(
            f"{self.config.environment}:{self.config.alias}:{routing_key}".encode("utf-8")
        ).digest()
        return int.from_bytes(digest[:4], "big") % 10_000 < self.config.canary_percentage * 100

    def _run(self, engine, request):
        started = self.clock()
        try:
            return engine.infer(request), (self.clock() - started) * 1000, False
        except Exception:
            return None, (self.clock() - started) * 1000, True

    def infer(self, request: TemporalInferenceRequest) -> dict:
        if request.model_id != self.active_engine.artifact.artifact_version:
            return self.active_engine.infer(request)
        active_result, active_latency, active_error = self._run(self.active_engine, request)
        if active_error:
            return self.active_engine.infer(request)
        candidate_result = None
        candidate_latency = None
        candidate_error = False
        candidate_enabled = self.config.mode in {"shadow", "canary"}
        if candidate_enabled and self.candidate_engine:
            candidate_request = request.model_copy(
                update={"model_id": self.candidate_engine.artifact.artifact_version}
            )
            candidate_result, candidate_latency, candidate_error = self._run(
                self.candidate_engine, candidate_request
            )
        selected_candidate = (
            self.config.mode == "canary"
            and self._candidate_selected(str(request.inference_id))
            and not candidate_error
        )
        effective = candidate_result if selected_candidate else active_result
        reason = "deterministic_canary" if selected_candidate else (
            "candidate_error_fallback" if self.config.mode == "canary" and candidate_error else
            "shadow_isolation" if self.config.mode == "shadow" else "stable_or_canary_control"
        )
        effective["rollout"] = {
            "environment": self.config.environment,
            "alias": self.config.alias,
            "mode": self.config.mode,
            "revision": self.config.revision,
            "active_model_id": self.active_engine.artifact.artifact_version,
            "candidate_model_id": (
                self.candidate_engine.artifact.artifact_version
                if candidate_enabled and self.candidate_engine else None
            ),
            "effective_model_id": effective["model_id"],
            "selected_role": "candidate" if selected_candidate else "active",
            "selection_reason": reason,
            "active_latency_ms": active_latency,
            "candidate_latency_ms": candidate_latency,
            "candidate_error": candidate_error,
            "outputs_agree": (
                active_result["state"] == candidate_result["state"]
                if candidate_result is not None else None
            ),
        }
        return effective
