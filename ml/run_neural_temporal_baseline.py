"""CLI for the offline PR24 masked-GRU comparison."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
from dataclasses import fields
from pathlib import Path
from typing import Any

import numpy
import torch

from ml.neural_temporal_baseline import GRUBaselineConfig, run_neural_temporal_baseline


ALLOWED_CLASSIFICATIONS = {"synthetic", "approved_pseudonymized"}


def load_config(path: Path) -> GRUBaselineConfig:
    payload = json.loads(path.read_text(encoding="utf-8"))
    allowed = {field.name for field in fields(GRUBaselineConfig)}
    unknown = set(payload) - allowed
    if unknown:
        raise ValueError(f"unknown_config_fields:{','.join(sorted(unknown))}")
    if "training_seeds" in payload:
        payload["training_seeds"] = tuple(payload["training_seeds"])
    return GRUBaselineConfig(**payload)


def synthetic_records(participants: int = 18) -> list[dict[str, Any]]:
    """Deterministic normalized-feature sequences for pipeline verification."""
    records = []
    labels = (1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1)
    for participant_index in range(participants):
        participant = f"synthetic-gru-{participant_index:02d}"
        for window_index, label in enumerate(labels):
            observable = not (window_index == 6 and participant_index % 5 == 0)
            centered = bool(label)
            jitter = ((participant_index * 7 + window_index * 3) % 9 - 4) / 200
            records.append({
                "participant_id": participant,
                "session_id": f"{participant}-session",
                "window_id": f"{participant}-window-{window_index:02d}",
                "timestamp_ms": window_index * 5000,
                "edge_profile_generation": 1,
                "label": label if observable else None,
                "features": ({
                    "face_center_x": (0.52 if centered else 0.86) + jitter,
                    "face_center_y": (0.44 if centered else 0.79) - jitter,
                    "face_width": 0.35 + jitter,
                    "face_height": 0.50,
                    "eye_span": 0.20,
                    "head_roll": (0.08 if centered else 0.50) + jitter,
                    "gaze_horizontal_proxy": (0.51 if centered else 0.84) - jitter,
                    "pose_available": 1.0,
                    "gaze_available": 1.0,
                } if observable else {}),
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
        payload = {"data_classification": "synthetic", "windows": synthetic_records()}
        input_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    else:
        input_bytes = arguments.input.read_bytes()
        payload = json.loads(input_bytes)
    classification = payload.get("data_classification")
    if classification not in ALLOWED_CLASSIFICATIONS:
        parser.error("Input rejected: missing or unsupported data_classification")
    config = load_config(arguments.config)
    result = run_neural_temporal_baseline(payload.get("windows") or [], config)
    output = {
        "provenance": {
            "data_classification": classification,
            "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
            "config_sha256": hashlib.sha256(arguments.config.read_bytes()).hexdigest(),
            "code_version": arguments.code_version,
            "runtime": {
                "python": platform.python_version(),
                "numpy": numpy.__version__,
                "torch": torch.__version__,
            },
        },
        "result": result,
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
