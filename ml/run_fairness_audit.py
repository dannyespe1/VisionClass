"""CLI for PR34 protected fairness auditing."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import random
from pathlib import Path
from typing import Any

from ml.fairness_audit import audit


CONFIG_FIELDS = {
    "schema_version", "protocol_version", "group_dimensions", "minimum_total_participants",
    "maximum_total_participants", "minimum_cell_participants", "minimum_observable_records",
    "minimum_positive_labels", "minimum_negative_labels", "common_threshold",
    "sensitivity_thresholds", "calibration_bins", "bootstrap_iterations", "bootstrap_seed",
    "maximum_error_or_calibration_gap", "maximum_coverage_gap", "minimum_coverage",
}


def load_config(path: Path) -> dict[str, Any]:
    config = json.loads(path.read_text(encoding="utf-8"))
    if set(config) != CONFIG_FIELDS or config["schema_version"] != "fairness-audit-v1":
        raise ValueError("invalid_config_fields")
    dimensions = config["group_dimensions"]
    if not isinstance(dimensions, list) or not 1 <= len(dimensions) <= 2 or len(dimensions) != len(set(dimensions)):
        raise ValueError("invalid_group_dimensions")
    if any(not isinstance(value, str) or not value for value in dimensions):
        raise ValueError("invalid_group_dimension_name")
    if not 2 <= int(config["minimum_total_participants"]) <= int(config["maximum_total_participants"]):
        raise ValueError("invalid_total_sample_limits")
    if int(config["minimum_cell_participants"]) < 5 or int(config["minimum_observable_records"]) < 1:
        raise ValueError("invalid_cell_suppression_limits")
    if int(config["minimum_positive_labels"]) < 1 or int(config["minimum_negative_labels"]) < 1:
        raise ValueError("invalid_outcome_suppression_limits")
    thresholds = [float(value) for value in config["sensitivity_thresholds"]]
    if not thresholds or any(not 0 < value < 1 for value in thresholds) or float(config["common_threshold"]) not in thresholds:
        raise ValueError("invalid_threshold_sensitivity")
    if int(config["bootstrap_iterations"]) < 100 or int(config["calibration_bins"]) < 2:
        raise ValueError("invalid_uncertainty_configuration")
    bounded = (
        "maximum_error_or_calibration_gap", "maximum_coverage_gap", "minimum_coverage",
    )
    if any(not 0 <= float(config[name]) <= 1 for name in bounded):
        raise ValueError("invalid_deployment_gate_limits")
    return config


def _rng(seed: int, participant: int, window: int) -> random.Random:
    digest = hashlib.sha256(f"{seed}:{participant}:{window}".encode()).digest()
    return random.Random(int.from_bytes(digest[:8], "big"))


def synthetic_records(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Deterministic privacy and disparity fixtures, never empirical evidence."""
    rows = []
    seed = int(config["bootstrap_seed"])
    participants = 96
    for participant_index in range(1, participants + 1):
        group_a = "a1" if participant_index % 2 else "a2"
        if participant_index <= 8:
            group_b = "b3_small"
        else:
            group_b = "b1" if participant_index % 4 in {0, 1} else "b2"
        if config["group_dimensions"] == ["gender_self_description"]:
            gender = ("g01", "g02", "g03")[(participant_index - 1) % 3]
            groups = {"gender_self_description": gender}
        else:
            groups = {"group_a": group_a, "group_b": group_b}
        participant_effect = ((participant_index * 13) % 17 - 8) / 100
        for window_index in range(1, 11):
            generator = _rng(seed, participant_index, window_index)
            label = 1 if generator.random() < 0.58 + participant_effect else 0
            observable = (participant_index * 5 + window_index * 3) % 19 not in {0, 1}
            if observable:
                base = 0.73 if label else 0.27
                disparity = -0.20 if (
                    (config["group_dimensions"] == ["gender_self_description"] and gender == "g03" and label)
                    or (config["group_dimensions"] != ["gender_self_description"] and group_a == "a2" and label)
                ) else 0.0
                probability = max(0.01, min(0.99, base + disparity + generator.uniform(-0.24, 0.24)))
                output_label = label
                reason = None
            else:
                probability = None
                output_label = None
                reason = "synthetic_signal_insufficient"
            rows.append({
                "participant_pseudo": f"syn-p{participant_index:03d}",
                "window_id": f"syn-w{participant_index:03d}-{window_index:02d}",
                "groups": groups,
                "label": output_label,
                "probability": None if probability is None else round(probability, 6),
                "observable": observable,
                "quality_reason": reason,
            })
    return rows


def _write_synthetic_csv(path: Path, records: list[dict[str, Any]], dimensions: list[str]) -> None:
    fields = ["participant_pseudo", "window_id", *dimensions, "label", "probability", "observable", "quality_reason"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in records:
            writer.writerow({
                "participant_pseudo": row["participant_pseudo"],
                "window_id": row["window_id"],
                **row["groups"],
                "label": row["label"],
                "probability": row["probability"],
                "observable": row["observable"],
                "quality_reason": row["quality_reason"],
            })


def run(*, config_path: Path, output_dir: Path, code_version: str, synthetic: bool, input_path: Path | None = None) -> dict[str, Any]:
    if synthetic == bool(input_path):
        raise ValueError("choose_exactly_one_of_input_or_synthetic")
    config = load_config(config_path)
    if synthetic:
        records = synthetic_records(config)
        classification = "synthetic_fairness_fixture"
        approvals = {
            "group_sufficiency": {"approved": False, "reference": None},
            "vault_release": {"approved": False, "reference": None},
        }
        input_bytes = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    else:
        input_bytes = input_path.read_bytes()
        payload = json.loads(input_bytes)
        if set(payload) != {"data_classification", "approvals", "records"}:
            raise ValueError("invalid_input_envelope")
        classification = payload["data_classification"]
        approvals = payload["approvals"]
        if classification != "real_approved_fairness_audit":
            raise ValueError("real_audit_requires_approved_classification")
        if not isinstance(approvals, dict) or set(approvals) != {"group_sufficiency", "vault_release"}:
            raise ValueError("invalid_approval_envelope")
        for name in ("group_sufficiency", "vault_release"):
            approval = approvals.get(name) if isinstance(approvals, dict) else None
            if not isinstance(approval, dict) or approval.get("approved") is not True or not approval.get("reference"):
                raise ValueError(f"missing_{name}_approval")
        records = payload["records"]

    result = audit(records, config)
    if synthetic:
        result["deployment_gate"]["status"] = "BLOCK_PROMOTION_SYNTHETIC_ONLY"
        if "SYNTHETIC_EVIDENCE_ONLY" not in result["deployment_gate"]["violations"]:
            result["deployment_gate"]["violations"].append("SYNTHETIC_EVIDENCE_ONLY")
    report = {
        "status": "SYNTHETIC_ONLY_NOT_FAIRNESS_EVIDENCE" if synthetic else "AUDIT_COMPLETE_REQUIRES_INDEPENDENT_REVIEW",
        "provenance": {
            "schema_version": config["schema_version"],
            "protocol_version": config["protocol_version"],
            "data_classification": classification,
            "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
            "config_sha256": hashlib.sha256(config_path.read_bytes()).hexdigest(),
            "code_version": code_version,
            "runtime": {"python": platform.python_version()},
            "approvals": approvals,
        },
        **result,
        "limitations": [
            "synthetic_results_do_not_establish_fairness" if synthetic else "observed_groups_do_not_cover_unmeasured_or_future_populations",
            "small_or_sparse_cells_are_suppressed_not_interpreted_as_no_disparity",
            "group_codes_are_release_scoped_and_must_not_be_joined_to_operational_identity",
            "threshold_sensitivity_does_not_authorize_group_specific_decisions",
        ],
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = "SYNTHETIC" if synthetic else "PROTECTED"
    (output_dir / f"{prefix}_FAIRNESS_REPORT.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if synthetic:
        _write_synthetic_csv(output_dir / "SYNTHETIC_FAIRNESS_RECORDS.csv", records, config["group_dimensions"])
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--code-version", required=True)
    parser.add_argument("--synthetic", action="store_true")
    parser.add_argument("--input", type=Path)
    args = parser.parse_args()
    run(config_path=args.config, output_dir=args.output_dir, code_version=args.code_version, synthetic=args.synthetic, input_path=args.input)


if __name__ == "__main__":
    main()
