"""Frozen-protocol evaluation of temporal observable-evidence models.

The module evaluates supplied predictions. It never trains on, selects a threshold
from, or imputes the held-out evaluation partition.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import log2
from statistics import mean
from typing import Any

from ml.baselines import BaselineConfig, classification_metrics, participant_bootstrap_intervals


@dataclass(frozen=True)
class DynamicEvaluationConfig:
    schema_version: str = "dynamic-evaluation-v1"
    protocol_version: str = "P0.3-v0.2-ratified-G3"
    frozen_threshold: float = 0.5
    threshold_source: str = "synthetic_development_fixture"
    expected_stride_ms: int = 5000
    maximum_gap_multiplier: float = 1.5
    calibration_bins: int = 10
    bootstrap_iterations: int = 200
    bootstrap_seeds: tuple[int, ...] = (23017, 23023)
    target_participants: int = 80
    maximum_participants: int = 100
    sesoi: float = 0.10
    minimum_auroc_lower_ci: float = 0.75
    minimum_sensitivity: float = 0.70
    minimum_specificity: float = 0.80
    minimum_absolute_auprc_gain: float = 0.15


def validate_config(config: DynamicEvaluationConfig) -> None:
    if not 0 < config.frozen_threshold < 1:
        raise ValueError("invalid_frozen_threshold")
    if not config.threshold_source.strip():
        raise ValueError("missing_threshold_source")
    if config.expected_stride_ms <= 0 or not 1 <= config.maximum_gap_multiplier <= 10:
        raise ValueError("invalid_contiguity_configuration")
    if config.bootstrap_iterations <= 0 or len(set(config.bootstrap_seeds)) < 2:
        raise ValueError("at_least_two_bootstrap_seeds_required")
    if config.target_participants <= 0 or config.maximum_participants < config.target_participants:
        raise ValueError("invalid_sample_limits")


def evaluate_dynamic_model(
    records: list[dict[str, Any]],
    config: DynamicEvaluationConfig,
    *,
    data_classification: str,
) -> dict[str, Any]:
    """Evaluate dynamic and static predictions on the same held-out windows."""
    validate_config(config)
    if data_classification not in {"synthetic", "real_approved_confirmatory"}:
        raise ValueError("unsupported_data_classification")
    if data_classification == "real_approved_confirmatory" and config.threshold_source == "synthetic_development_fixture":
        raise ValueError("real_evaluation_requires_frozen_development_threshold_provenance")
    ordered = _validate_and_order(records)
    test_records = [row for row in ordered if row["split"] == "test"]
    if not test_records:
        raise ValueError("missing_test_partition")

    dynamic = _predictions(test_records, "dynamic_probability")
    baseline = _predictions(test_records, "baseline_probability")
    dynamic_metrics = classification_metrics(dynamic, config.frozen_threshold, config.calibration_bins)
    baseline_metrics = classification_metrics(baseline, config.frozen_threshold, config.calibration_bins)
    intervals = {}
    for seed in config.bootstrap_seeds:
        bootstrap_config = BaselineConfig(
            seed=seed,
            bootstrap_iterations=config.bootstrap_iterations,
            calibration_bins=config.calibration_bins,
            minimum_sensitivity=config.minimum_sensitivity,
            minimum_specificity=config.minimum_specificity,
        )
        intervals[str(seed)] = {
            "dynamic": participant_bootstrap_intervals(dynamic, config.frozen_threshold, bootstrap_config),
            "static_baseline": participant_bootstrap_intervals(baseline, config.frozen_threshold, bootstrap_config),
        }

    total_participant_count = len({row["participant_id"] for row in ordered})
    test_participant_count = len({row["participant_id"] for row in test_records})
    auprc_gain = dynamic_metrics["auprc"] - baseline_metrics["prevalence"]
    task_f1_gain = _positive_f1(dynamic_metrics["confusion_matrix"]) - _positive_f1(baseline_metrics["confusion_matrix"])
    lower_bounds = [
        result["dynamic"]["auroc"][0]
        for result in intervals.values()
        if result["dynamic"]["auroc"] is not None
    ]
    criteria = {
        "target_sample_reached": total_participant_count >= config.target_participants,
        "sample_within_approved_maximum": total_participant_count <= config.maximum_participants,
        "sesoi_task_f1_gain": task_f1_gain >= config.sesoi,
        "auroc_lower_ci": bool(lower_bounds) and min(lower_bounds) >= config.minimum_auroc_lower_ci,
        "sensitivity": dynamic_metrics["sensitivity"] >= config.minimum_sensitivity,
        "specificity": dynamic_metrics["specificity"] >= config.minimum_specificity,
        "absolute_auprc_gain_over_prevalence": auprc_gain >= config.minimum_absolute_auprc_gain,
    }
    confirmatory = data_classification == "real_approved_confirmatory"
    gate_status = "PASS" if confirmatory and all(criteria.values()) else (
        "FAIL" if confirmatory else "NOT_EVALUABLE_SYNTHETIC"
    )

    return {
        "schema_version": config.schema_version,
        "protocol_version": config.protocol_version,
        "interpretation": "observable_task_orientation_evidence_not_internal_attention",
        "data_classification": data_classification,
        "split_policy": "participant_exclusive_before_windowing_test_only_evaluation",
        "threshold_policy": "frozen_from_development_never_selected_on_test",
        "config": asdict(config),
        "sample": {
            "total_participants": total_participant_count,
            "test_participants": test_participant_count,
            "test_windows": len(test_records),
            "target_participants": config.target_participants,
            "maximum_participants": config.maximum_participants,
        },
        "classification": {
            "dynamic_model": dynamic_metrics,
            "static_baseline": baseline_metrics,
            "absolute_auprc_gain_over_prevalence": auprc_gain,
            "task_f1_gain_over_static_baseline": task_f1_gain,
            "bootstrap_ci95_by_seed": intervals,
        },
        "dynamics": _temporal_metrics(test_records, config),
        "participant_error": _participant_error(test_records, config.frozen_threshold),
        "confirmatory_gate": {"status": gate_status, "criteria": criteria},
        "construct_validity": {
            "status": "NOT_ESTABLISHED_BY_CLASSIFICATION_OR_TEMPORAL_METRICS",
            "note": "These results do not establish attention, cognition, diagnosis, or causal effect.",
        },
        "non_use_conditions": [
            "no_observable_or_failed_quality",
            "consent_or_camera_permission_not_valid",
            "profile_generation_changed_or_gap_exceeded",
            "participant_exclusive_split_cannot_be_verified",
            "confirmatory_sample_or_joint_minimum_effect_not_met",
            "automated_intervention_or_diagnostic_use",
        ],
    }


def _validate_and_order(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        raise ValueError("empty_evaluation_records")
    participant_splits: dict[str, str] = {}
    window_ids: set[str] = set()
    for row in records:
        participant = str(row.get("participant_id", "")).strip()
        session = str(row.get("session_id", "")).strip()
        window_id = str(row.get("window_id", "")).strip()
        split = str(row.get("split", "")).strip()
        if not participant or not session or not window_id or split not in {"train", "validation", "test"}:
            raise ValueError("invalid_record_identity_or_split")
        if window_id in window_ids:
            raise ValueError("duplicate_window_id")
        window_ids.add(window_id)
        previous = participant_splits.setdefault(participant, split)
        if previous != split:
            raise ValueError(f"participant_leakage:{participant}")
        timestamp = row.get("timestamp_ms")
        if isinstance(timestamp, bool) or not isinstance(timestamp, int) or timestamp < 0:
            raise ValueError("invalid_timestamp_ms")
        duration = row.get("duration_ms")
        if isinstance(duration, bool) or not isinstance(duration, int) or duration <= 0:
            raise ValueError("invalid_duration_ms")
        observable = (row.get("quality") or {}).get("observable") is True
        if observable:
            if (row.get("quality") or {}).get("pass") is not True:
                raise ValueError("observable_window_requires_quality_pass")
            if row.get("label") not in (0, 1):
                raise ValueError("observable_window_requires_binary_label")
            for name in ("dynamic_probability", "baseline_probability"):
                value = row.get(name)
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= float(value) <= 1:
                    raise ValueError(f"invalid_{name}")
        elif row.get("dynamic_probability") is not None or row.get("baseline_probability") is not None:
            raise ValueError("no_observable_probability_must_be_null")
    ordered = sorted(records, key=lambda row: (row["participant_id"], row["session_id"], row["timestamp_ms"]))
    groups: dict[tuple[str, str], list[int]] = {}
    for row in ordered:
        groups.setdefault((row["participant_id"], row["session_id"]), []).append(row["timestamp_ms"])
    if any(any(b <= a for a, b in zip(values, values[1:])) for values in groups.values()):
        raise ValueError("timestamps_not_strictly_increasing")
    return ordered


def _predictions(records: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    return [{
        "participant_id": row["participant_id"],
        "window_id": row["window_id"],
        "label": row.get("label"),
        "probability": row.get(field),
    } for row in records]


def _state(row: dict[str, Any], threshold: float) -> int | None:
    probability = row.get("dynamic_probability")
    return None if probability is None else int(float(probability) >= threshold)


def _temporal_metrics(records: list[dict[str, Any]], config: DynamicEvaluationConfig) -> dict[str, Any]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in records:
        groups.setdefault((row["participant_id"], row["session_id"]), []).append(row)
    valid_deltas: list[float] = []
    transitions = {"0_to_0": 0, "0_to_1": 0, "1_to_0": 0, "1_to_1": 0}
    episode_durations: list[int] = []
    change_delays: list[int] = []
    change_censored = 0
    recovery_delays: list[int] = []
    recovery_censored = 0
    entropies: list[float] = []
    noise: dict[str, Any] = {
        "eligible_pairs": 0,
        "included_pairs": 0,
        "quality_or_illumination_breaks": 0,
        "gap_or_suspension_breaks": 0,
        "edge_profile_breaks": 0,
        "no_observable_by_reason": {},
    }
    max_gap = config.expected_stride_ms * config.maximum_gap_multiplier

    for sequence in groups.values():
        sequence.sort(key=lambda row: row["timestamp_ms"])
        for row in sequence:
            probability = row.get("dynamic_probability")
            if probability is None:
                reason = str((row.get("quality") or {}).get("reason") or "unspecified")
                noise["no_observable_by_reason"][reason] = noise["no_observable_by_reason"].get(reason, 0) + 1
                if (row.get("quality") or {}).get("pass") is False:
                    noise["quality_or_illumination_breaks"] += 1
            else:
                p = min(max(float(probability), 1e-12), 1 - 1e-12)
                entropies.append(-(p * log2(p) + (1 - p) * log2(1 - p)))

        segments: list[list[dict[str, Any]]] = []
        segment: list[dict[str, Any]] = []
        for index, row in enumerate(sequence):
            if index:
                noise["eligible_pairs"] += 1
            if row.get("dynamic_probability") is None:
                if segment:
                    segments.append(segment)
                    segment = []
                continue
            if segment:
                previous = segment[-1]
                gap = row["timestamp_ms"] - previous["timestamp_ms"]
                profile_changed = row.get("edge_profile_generation") != previous.get("edge_profile_generation")
                if gap > max_gap or profile_changed:
                    if gap > max_gap:
                        noise["gap_or_suspension_breaks"] += 1
                    if profile_changed:
                        noise["edge_profile_breaks"] += 1
                    segments.append(segment)
                    segment = []
            segment.append(row)
        if segment:
            segments.append(segment)

        for segment in segments:
            states = [_state(row, config.frozen_threshold) for row in segment]
            for left, right, left_state, right_state in zip(segment, segment[1:], states, states[1:]):
                noise["included_pairs"] += 1
                valid_deltas.append(abs(float(right["dynamic_probability"]) - float(left["dynamic_probability"])))
                transitions[f"{left_state}_to_{right_state}"] += 1
            run_duration = int(segment[0]["duration_ms"])
            for row, previous, current in zip(segment[1:], states, states[1:]):
                if previous == current:
                    run_duration += int(row["duration_ms"])
                else:
                    episode_durations.append(run_duration)
                    run_duration = int(row["duration_ms"])
            episode_durations.append(run_duration)

            for index in range(1, len(segment)):
                if segment[index]["label"] == segment[index - 1]["label"]:
                    continue
                target = int(segment[index]["label"])
                match = next((candidate for candidate in range(index, len(segment)) if states[candidate] == target), None)
                if match is None:
                    change_censored += 1
                else:
                    change_delays.append(segment[match]["timestamp_ms"] - segment[index]["timestamp_ms"])

            for index in range(1, len(segment)):
                if states[index - 1:index + 1] != [1, 0]:
                    continue
                recovery = next((candidate for candidate in range(index + 1, len(segment)) if states[candidate - 1:candidate + 1] == [1, 1]), None)
                if recovery is None:
                    recovery_censored += 1
                else:
                    recovery_delays.append(segment[recovery]["timestamp_ms"] - segment[index]["timestamp_ms"])

    transition_total = sum(transitions.values())
    return {
        "volatility_mean_absolute_adjacent_change": mean(valid_deltas) if valid_deltas else None,
        "transition_counts": transitions,
        "transition_denominator": transition_total,
        "transition_probabilities": {
            "off_task_evidence": {
                "to_off_task_evidence": _ratio(transitions["0_to_0"], transitions["0_to_0"] + transitions["0_to_1"]),
                "to_task_oriented_evidence": _ratio(transitions["0_to_1"], transitions["0_to_0"] + transitions["0_to_1"]),
            },
            "task_oriented_evidence": {
                "to_off_task_evidence": _ratio(transitions["1_to_0"], transitions["1_to_0"] + transitions["1_to_1"]),
                "to_task_oriented_evidence": _ratio(transitions["1_to_1"], transitions["1_to_0"] + transitions["1_to_1"]),
            },
        },
        "persistence": {
            "off_task_evidence": _ratio(transitions["0_to_0"], transitions["0_to_0"] + transitions["0_to_1"]),
            "task_oriented_evidence": _ratio(transitions["1_to_1"], transitions["1_to_0"] + transitions["1_to_1"]),
        },
        "episode_dwell_ms": _summary(episode_durations),
        "recovery_delay_ms": {**_summary(recovery_delays), "right_censored": recovery_censored},
        "change_detection_delay_ms": {**_summary(change_delays), "right_censored": change_censored},
        "normalized_predictive_entropy": mean(entropies) if entropies else None,
        "coverage": {
            "inference": _ratio(sum(row.get("dynamic_probability") is not None for row in records), len(records)),
            "label": _ratio(sum(row.get("label") in (0, 1) for row in records), len(records)),
            "observable_valid_windows": sum(row.get("dynamic_probability") is not None for row in records),
            "eligible_windows": len(records),
        },
        "noise_and_segment_breaks": noise,
    }


def _participant_error(records: list[dict[str, Any]], threshold: float) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in records:
        groups.setdefault(row["participant_id"], []).append(row)
    output = []
    for participant_index, (_, rows) in enumerate(sorted(groups.items()), start=1):
        eligible = [row for row in rows if row.get("dynamic_probability") is not None]
        errors = sum(_state(row, threshold) != row["label"] for row in eligible)
        output.append({
            "participant_index": participant_index,
            "eligible_windows": len(eligible),
            "total_windows": len(rows),
            "coverage": _ratio(len(eligible), len(rows)),
            "error_rate": _ratio(errors, len(eligible)),
        })
    return output


def _summary(values: list[int]) -> dict[str, Any]:
    return {"count": len(values), "mean": mean(values) if values else None, "minimum": min(values) if values else None, "maximum": max(values) if values else None}


def _ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def _positive_f1(confusion: dict[str, int]) -> float:
    denominator = 2 * confusion["tp"] + confusion["fp"] + confusion["fn"]
    return (2 * confusion["tp"] / denominator) if denominator else 0.0
