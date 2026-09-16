"""CLI for the PR23 frozen temporal evaluation protocol."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
from dataclasses import fields
from pathlib import Path
from typing import Any

import numpy

from ml.dynamic_evaluation import DynamicEvaluationConfig, evaluate_dynamic_model


ALLOWED_CLASSIFICATIONS = {"synthetic", "real_approved_confirmatory"}


def load_config(path: Path) -> DynamicEvaluationConfig:
    payload = json.loads(path.read_text(encoding="utf-8"))
    allowed = {field.name for field in fields(DynamicEvaluationConfig)}
    unknown = set(payload) - allowed
    if unknown:
        raise ValueError(f"unknown_config_fields:{','.join(sorted(unknown))}")
    if "bootstrap_seeds" in payload:
        payload["bootstrap_seeds"] = tuple(payload["bootstrap_seeds"])
    return DynamicEvaluationConfig(**payload)


def synthetic_records(participants: int = 15) -> list[dict[str, Any]]:
    """Deterministic data for pipeline verification, never scientific evidence."""
    records = []
    labels = (1, 1, 0, 0, 1, 1, 0, 0, 1, 1)
    for participant_index in range(participants):
        split = "train" if participant_index < 8 else "validation" if participant_index < 11 else "test"
        participant = f"synthetic-{participant_index:02d}"
        for window_index, label in enumerate(labels):
            observable = not (window_index == 4 and participant_index % 3 == 0)
            dynamic_probability = (0.82 if label else 0.18) if observable else None
            baseline_probability = (0.62 if label else 0.38) if observable else None
            if observable and (participant_index + window_index) % 9 == 0:
                baseline_probability = 1 - baseline_probability
            records.append({
                "participant_id": participant,
                "session_id": f"{participant}-session",
                "window_id": f"{participant}-window-{window_index:02d}",
                "split": split,
                "timestamp_ms": window_index * 5000,
                "duration_ms": 5000,
                "edge_profile_generation": 1,
                "label": label if observable else None,
                "dynamic_probability": dynamic_probability,
                "baseline_probability": baseline_probability,
                "quality": {
                    "observable": observable,
                    "pass": observable,
                    "reason": None if observable else "synthetic_low_confidence",
                },
            })
    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path)
    parser.add_argument("--synthetic", action="store_true")
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--code-version", required=True)
    arguments = parser.parse_args()
    if arguments.synthetic == bool(arguments.input):
        parser.error("choose_exactly_one_of_input_or_synthetic")

    if arguments.synthetic:
        input_payload = {"data_classification": "synthetic", "records": synthetic_records()}
        input_bytes = json.dumps(input_payload, sort_keys=True).encode("utf-8")
    else:
        input_bytes = arguments.input.read_bytes()
        input_payload = json.loads(input_bytes)
    classification = input_payload.get("data_classification")
    if classification not in ALLOWED_CLASSIFICATIONS:
        parser.error("Input rejected: missing or unsupported data_classification")

    result = evaluate_dynamic_model(
        input_payload.get("records") or [],
        load_config(arguments.config),
        data_classification=classification,
    )
    artifact = {
        "provenance": {
            "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
            "config_sha256": hashlib.sha256(arguments.config.read_bytes()).hexdigest(),
            "code_version": arguments.code_version,
            "runtime": {"python": platform.python_version(), "numpy": numpy.__version__},
        },
        "result": result,
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
