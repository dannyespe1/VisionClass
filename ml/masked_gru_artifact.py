"""Safe JSON artifact and inference runtime for the masked GRU candidate.

The runtime consumes normalized derived features only. It does not accept raw
images and keeps the candidate isolated from product decisions.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from math import isfinite
from pathlib import Path
from typing import Any

import torch

from ml.baselines import FEATURE_CONTRACT, FEATURE_NAMES
from ml.neural_temporal_baseline import MaskedGRUClassifier


ARTIFACT_SCHEMA = "visionclass-masked-gru-artifact-v1"
FEATURE_BOUNDS = {
    "face_center_x": (0.0, 1.0),
    "face_center_y": (0.0, 1.0),
    "face_width": (0.0, 1.0),
    "face_height": (0.0, 1.0),
    "eye_span": (0.0, 1.0),
    "head_roll": (-1.0, 1.0),
    "gaze_horizontal_proxy": (0.0, 1.0),
    "pose_available": (0.0, 1.0),
    "gaze_available": (0.0, 1.0),
}


def canonical_sha256(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def build_artifact(comparison: dict[str, Any]) -> dict[str, Any]:
    result = comparison["result"]
    candidate = result["candidate"]
    config = result["config"]
    if comparison["provenance"]["data_classification"] != "synthetic":
        raise ValueError("initial_artifact_requires_synthetic_source")
    if result["feature_contract"] != FEATURE_CONTRACT:
        raise ValueError("feature_contract_mismatch")

    weights = candidate["model_state"]
    weight_digest = canonical_sha256(weights)
    if weight_digest != candidate["model_state_sha256"]:
        raise ValueError("model_state_sha256_mismatch")

    selected_run = next(
        run
        for run in result["comparisons"]["masked_gru_runs"]
        if run["seed"] == candidate["selected_seed"]
    )
    return {
        "schema_version": ARTIFACT_SCHEMA,
        "artifact_version": "masked-gru-observable-evidence-v1-synthetic",
        "feature_contract": FEATURE_CONTRACT,
        "feature_names": list(FEATURE_NAMES),
        "architecture": {
            "family": "masked_gru",
            "input_size": len(FEATURE_NAMES),
            "hidden_size": config["hidden_size"],
            "output_size": 1,
            "output_activation": "sigmoid",
            "parameter_count": selected_run["cost"]["parameter_count"],
            "parameter_bytes_float32": selected_run["cost"]["parameter_bytes_float32"],
        },
        "sequence_policy": {
            "maximum_gap_ms": config["maximum_gap_ms"],
            "reset_on_first_window": True,
            "reset_on_profile_generation_change": True,
            "reset_on_non_observable_window": True,
        },
        "decision": {
            "threshold": candidate["threshold_selection"]["threshold"],
            "positive_state": "task_oriented_evidence",
            "negative_state": "off_task_evidence",
            "missing_state": "no_observable",
        },
        "lifecycle": {
            "mode": "shadow_only",
            "active": False,
            "allow_intervention": False,
            "requires_raw_media": False,
            "promotion_status": candidate["promotion_status"],
        },
        "provenance": {
            **comparison["provenance"],
            "selected_seed": candidate["selected_seed"],
            "selected_epoch": selected_run["selected_epoch"],
            "source_artifact": "docs/PR24/SYNTHETIC_GRU_COMPARISON.json",
        },
        "synthetic_test_metrics": selected_run["test"],
        "operating_constraints_met": candidate["test_operating_constraints_met"],
        "weights_sha256": weight_digest,
        "weights": weights,
    }


def write_artifact(comparison_path: Path, output_path: Path) -> dict[str, Any]:
    artifact = build_artifact(json.loads(comparison_path.read_text(encoding="utf-8")))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return artifact


@dataclass
class MaskedGRUInferenceRuntime:
    artifact: dict[str, Any]
    model: MaskedGRUClassifier

    @classmethod
    def load(cls, path: str | Path) -> "MaskedGRUInferenceRuntime":
        artifact = json.loads(Path(path).read_text(encoding="utf-8"))
        _validate_artifact(artifact)
        architecture = artifact["architecture"]
        model = MaskedGRUClassifier(
            int(architecture["input_size"]), int(architecture["hidden_size"])
        )
        state = {
            name: torch.tensor(value, dtype=torch.float32)
            for name, value in artifact["weights"].items()
        }
        model.load_state_dict(state, strict=True)
        model.eval()
        return cls(artifact=artifact, model=model)

    def predict(self, windows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not windows:
            raise ValueError("empty_sequence")
        feature_rows: list[list[float]] = []
        observable_rows: list[bool] = []
        reset_rows: list[bool] = []
        previous: dict[str, Any] | None = None
        maximum_gap_ms = int(self.artifact["sequence_policy"]["maximum_gap_ms"])

        for window in windows:
            timestamp_ms = window.get("timestamp_ms")
            if isinstance(timestamp_ms, bool) or not isinstance(timestamp_ms, int):
                raise ValueError("invalid_timestamp_ms")
            if previous is not None and timestamp_ms <= previous["timestamp_ms"]:
                raise ValueError("non_monotonic_timestamp_ms")
            observable = (window.get("quality") or {}).get("observable") is True
            features = window.get("features") or {}
            feature_rows.append(_feature_vector(features) if observable else [0.0] * len(FEATURE_NAMES))
            observable_rows.append(observable)
            reset_rows.append(
                previous is None
                or timestamp_ms - previous["timestamp_ms"] > maximum_gap_ms
                or window.get("edge_profile_generation")
                != previous.get("edge_profile_generation")
            )
            previous = window

        with torch.no_grad():
            logits = self.model(
                torch.tensor(feature_rows, dtype=torch.float32),
                torch.tensor(observable_rows, dtype=torch.bool),
                torch.tensor(reset_rows, dtype=torch.bool),
            )
            probabilities = torch.sigmoid(logits).tolist()

        threshold = float(self.artifact["decision"]["threshold"])
        output = []
        for window, observable, probability in zip(windows, observable_rows, probabilities):
            if not observable:
                probability_value = None
                state = self.artifact["decision"]["missing_state"]
            else:
                probability_value = float(probability)
                state = (
                    self.artifact["decision"]["positive_state"]
                    if probability_value >= threshold
                    else self.artifact["decision"]["negative_state"]
                )
            output.append({
                "window_id": window.get("window_id"),
                "probability": probability_value,
                "state": state,
                "model_version": self.artifact["artifact_version"],
                "mode": self.artifact["lifecycle"]["mode"],
            })
        return output


def _feature_vector(features: dict[str, Any]) -> list[float]:
    vector = []
    for name in FEATURE_NAMES:
        value = features.get(name)
        if isinstance(value, bool):
            raise ValueError(f"invalid_feature:{name}")
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"invalid_feature:{name}") from exc
        low, high = FEATURE_BOUNDS[name]
        if not isfinite(number) or not low <= number <= high:
            raise ValueError(f"feature_out_of_range:{name}")
        vector.append(number)
    return vector


def _validate_artifact(artifact: dict[str, Any]) -> None:
    if artifact.get("schema_version") != ARTIFACT_SCHEMA:
        raise ValueError("unsupported_artifact_schema")
    if artifact.get("feature_contract") != FEATURE_CONTRACT:
        raise ValueError("feature_contract_mismatch")
    if artifact.get("feature_names") != list(FEATURE_NAMES):
        raise ValueError("feature_order_mismatch")
    if canonical_sha256(artifact.get("weights")) != artifact.get("weights_sha256"):
        raise ValueError("weights_sha256_mismatch")
    lifecycle = artifact.get("lifecycle") or {}
    if (
        lifecycle.get("mode") != "shadow_only"
        or lifecycle.get("active") is not False
        or lifecycle.get("allow_intervention") is not False
        or lifecycle.get("requires_raw_media") is not False
    ):
        raise ValueError("unsafe_initial_lifecycle")
    threshold = (artifact.get("decision") or {}).get("threshold")
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
        raise ValueError("invalid_decision_threshold")
    if not isfinite(float(threshold)) or not 0.0 <= float(threshold) <= 1.0:
        raise ValueError("invalid_decision_threshold")
