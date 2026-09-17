"""CLI for the PR32 agreement and convergent-validity analysis."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import random
from pathlib import Path
from typing import Any

from ml.validity_agreement import REQUIRED_FIELDS, analyze


CONFIG_FIELDS = {
    "schema_version", "protocol_version", "manual_version", "minimum_participants",
    "maximum_participants", "phase_count", "self_report_phases", "frozen_threshold",
    "calibration_bins", "bootstrap_iterations", "bootstrap_seed",
}


def load_config(path: Path) -> dict[str, Any]:
    config = json.loads(path.read_text(encoding="utf-8"))
    if set(config) != CONFIG_FIELDS or config["schema_version"] != "validity-agreement-v1":
        raise ValueError("invalid_config_fields")
    if not 2 <= int(config["minimum_participants"]) <= int(config["maximum_participants"]):
        raise ValueError("invalid_participant_limits")
    if int(config["phase_count"]) < 2:
        raise ValueError("invalid_phase_count")
    phases = config["self_report_phases"]
    if not phases or len(phases) != len(set(phases)) or any(not 1 <= int(value) <= config["phase_count"] for value in phases):
        raise ValueError("invalid_self_report_phases")
    if not 0 < float(config["frozen_threshold"]) < 1 or int(config["calibration_bins"]) < 2:
        raise ValueError("invalid_analysis_parameters")
    if int(config["bootstrap_iterations"]) < 100:
        raise ValueError("invalid_bootstrap_iterations")
    return config


def _rng(seed: int, participant: int, phase: int) -> random.Random:
    digest = hashlib.sha256(f"{seed}:{participant}:{phase}".encode()).digest()
    return random.Random(int.from_bytes(digest[:8], "big"))


def synthetic_records(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Create deterministic fixtures; values are not empirical evidence."""
    rows: list[dict[str, Any]] = []
    participants = int(config["minimum_participants"])
    report_phases = set(config["self_report_phases"])
    seed = int(config["bootstrap_seed"])
    for participant_index in range(1, participants + 1):
        participant = f"syn-p{participant_index:03d}"
        session = f"syn-s{participant_index:03d}"
        participant_effect = ((participant_index * 17) % 19 - 9) / 80
        for phase in range(1, int(config["phase_count"]) + 1):
            generator = _rng(seed, participant_index, phase)
            latent = max(0.03, min(0.97, 0.66 + participant_effect + 0.12 * math_wave(phase) + generator.uniform(-0.22, 0.22)))
            signal_observable = (participant_index * 11 + phase * 7) % 31 not in {0, 1}
            probability = max(0.01, min(0.99, latent + generator.uniform(-0.14, 0.14))) if signal_observable else None
            observer_a = observer_label(latent, generator.random())
            observer_b = observer_label(latent, generator.random())
            prompted = phase in report_phases
            if prompted:
                draw = generator.random()
                if draw < 0.07:
                    self_report = "omitted"
                elif draw < 0.13:
                    self_report = "unsure"
                else:
                    self_report = "focused" if generator.random() < latent else "distracted"
            else:
                self_report = None
            interaction_count = max(0, round(1 + 4 * latent + generator.uniform(-1.4, 1.4)))
            micro = None
            if phase in {7, 14}:
                micro = generator.random() < (0.32 + 0.55 * latent)
            rows.append({
                "participant_pseudo": participant,
                "session_id": session,
                "phase_index": phase,
                "timestamp_ms": (participant_index * 100_000) + phase * 20_000,
                "observer_a": observer_a,
                "observer_b": observer_b,
                "inference_probability": None if probability is None else round(probability, 6),
                "self_report_prompted": prompted,
                "self_report": self_report,
                "interaction_count": interaction_count,
                "micro_assessment_correct": micro,
                "observable": signal_observable,
                "quality_reason": None if signal_observable else "synthetic_signal_insufficient",
            })
    return rows


def math_wave(phase: int) -> float:
    cycle = (phase - 1) % 6
    return (0.0, 0.7, 1.0, 0.3, -0.7, -1.0)[cycle]


def observer_label(latent: float, draw: float) -> str:
    if draw < 0.045:
        return "no_observable"
    if draw < 0.09:
        return "uncertain"
    error = 0.12
    attentive = latent >= 0.5
    if draw > 1 - error:
        attentive = not attentive
    return "attentive" if attentive else "distracted"


def _write_csv(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=sorted(REQUIRED_FIELDS))
        writer.writeheader()
        writer.writerows(records)


def run(
    *,
    config_path: Path,
    output_dir: Path,
    code_version: str,
    synthetic: bool,
    input_path: Path | None = None,
) -> dict[str, Any]:
    if synthetic == bool(input_path):
        raise ValueError("choose_exactly_one_of_input_or_synthetic")
    config = load_config(config_path)
    if synthetic:
        records = synthetic_records(config)
        classification = "synthetic_development_fixture"
        sufficiency = {"approved": False, "reference": None, "scope": "synthetic_numeric_check_only"}
        input_bytes = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    else:
        input_bytes = input_path.read_bytes()
        payload = json.loads(input_bytes)
        if set(payload) != {"data_classification", "sample_sufficiency", "records"}:
            raise ValueError("invalid_input_envelope")
        classification = payload["data_classification"]
        sufficiency = payload["sample_sufficiency"]
        if classification != "real_approved_confirmatory":
            raise ValueError("real_analysis_requires_approved_classification")
        if not isinstance(sufficiency, dict) or sufficiency.get("approved") is not True or not sufficiency.get("reference"):
            raise ValueError("missing_sample_sufficiency_evidence")
        records = payload["records"]

    analysis = analyze(records, config)
    status = "SYNTHETIC_ONLY_NOT_CONFIRMATORY" if synthetic else "ANALYSIS_COMPLETE_REQUIRES_INDEPENDENT_REVIEW"
    report = {
        "status": status,
        "provenance": {
            "schema_version": config["schema_version"],
            "protocol_version": config["protocol_version"],
            "manual_version": config["manual_version"],
            "data_classification": classification,
            "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
            "config_sha256": hashlib.sha256(config_path.read_bytes()).hexdigest(),
            "code_version": code_version,
            "runtime": {"python": platform.python_version()},
            "sample_sufficiency": sufficiency,
        },
        **analysis,
        "limitations": [
            "synthetic_values_are_not_empirical_evidence" if synthetic else "observational_associations_do_not_establish_causality",
            "agreement_does_not_establish_construct_validity",
            "window_counts_are_not_independent_sample_size",
            "missingness_and_no_observable_must_not_be_imputed_as_negative",
            "external_contexts_require_new_validation",
        ],
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = "SYNTHETIC" if synthetic else "CONFIRMATORY"
    _write_csv(output_dir / f"{prefix}_VALIDITY_RECORDS.csv", records)
    (output_dir / f"{prefix}_VALIDITY_REPORT.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--code-version", required=True)
    parser.add_argument("--synthetic", action="store_true")
    parser.add_argument("--input", type=Path)
    args = parser.parse_args()
    run(
        config_path=args.config,
        output_dir=args.output_dir,
        code_version=args.code_version,
        synthetic=args.synthetic,
        input_path=args.input,
    )


if __name__ == "__main__":
    main()
