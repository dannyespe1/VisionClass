"""PR34 privacy-preserving group and intersection fairness audit."""

from __future__ import annotations

import math
import random
import re
from collections import defaultdict
from statistics import mean
from typing import Any


OPAQUE = re.compile(r"[A-Za-z0-9_-]{1,48}")
REQUIRED_FIELDS = {
    "participant_pseudo", "window_id", "groups", "label", "probability",
    "observable", "quality_reason",
}
METRICS = ("false_positive_rate", "false_negative_rate", "macro_f1", "ece", "brier", "coverage")


def validate_records(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, int]:
    if not records:
        raise ValueError("empty_fairness_dataset")
    dimensions = tuple(config["group_dimensions"])
    seen: set[str] = set()
    participants: set[str] = set()
    for row in records:
        if set(row) != REQUIRED_FIELDS:
            raise ValueError("invalid_fairness_fields")
        participant = row["participant_pseudo"]
        window = row["window_id"]
        if not isinstance(participant, str) or OPAQUE.fullmatch(participant) is None:
            raise ValueError("invalid_pseudonymous_participant")
        if not isinstance(window, str) or OPAQUE.fullmatch(window) is None or window in seen:
            raise ValueError("invalid_or_duplicate_window")
        seen.add(window)
        participants.add(participant)
        groups = row["groups"]
        if not isinstance(groups, dict) or set(groups) != set(dimensions):
            raise ValueError("invalid_group_dimensions")
        for value in groups.values():
            if value is not None and (not isinstance(value, str) or OPAQUE.fullmatch(value) is None):
                raise ValueError("group_values_must_be_opaque_codes")
        observable = row["observable"]
        if type(observable) is not bool:
            raise ValueError("invalid_observable_flag")
        label, probability = row["label"], row["probability"]
        if observable:
            if type(label) is not int or label not in {0, 1}:
                raise ValueError("invalid_binary_label")
            if probability is None or isinstance(probability, bool) or not 0 <= float(probability) <= 1:
                raise ValueError("invalid_probability")
            if row["quality_reason"] is not None:
                raise ValueError("observable_cannot_have_quality_reason")
        elif label is not None or probability is not None or not isinstance(row["quality_reason"], str) or not row["quality_reason"]:
            raise ValueError("no_observable_requires_null_outcomes_and_reason")
    participant_count = len(participants)
    if participant_count < int(config["minimum_total_participants"]):
        raise ValueError("insufficient_total_participants")
    if participant_count > int(config["maximum_total_participants"]):
        raise ValueError("total_participants_exceed_protocol")
    return {"participants": participant_count, "records": len(records)}


def _binary_metrics(records: list[dict[str, Any]], threshold: float, bins: int) -> dict[str, Any]:
    observed = [row for row in records if row["observable"]]
    tp = sum(row["probability"] >= threshold and row["label"] == 1 for row in observed)
    tn = sum(row["probability"] < threshold and row["label"] == 0 for row in observed)
    fp = sum(row["probability"] >= threshold and row["label"] == 0 for row in observed)
    fn = sum(row["probability"] < threshold and row["label"] == 1 for row in observed)
    f1_positive = 2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else None
    f1_negative = 2 * tn / (2 * tn + fp + fn) if 2 * tn + fp + fn else None
    calibration = []
    ece = 0.0
    for index in range(bins):
        low, high = index / bins, (index + 1) / bins
        selected = [row for row in observed if low <= row["probability"] < high or (index == bins - 1 and row["probability"] == 1)]
        if not selected:
            continue
        predicted = mean(row["probability"] for row in selected)
        actual = mean(row["label"] for row in selected)
        ece += len(selected) / len(observed) * abs(predicted - actual)
        calibration.append({"lower": low, "upper": high, "n": len(selected), "predicted_mean": predicted, "observed_rate": actual})
    return {
        "participants": len({row["participant_pseudo"] for row in records}),
        "records": len(records),
        "observable_records": len(observed),
        "positive_labels": tp + fn,
        "negative_labels": tn + fp,
        "confusion": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "false_positive_rate": fp / (fp + tn) if fp + tn else None,
        "false_negative_rate": fn / (fn + tp) if fn + tp else None,
        "macro_f1": mean([value for value in (f1_positive, f1_negative) if value is not None]) if f1_positive is not None or f1_negative is not None else None,
        "ece": ece if observed else None,
        "brier": mean((row["probability"] - row["label"]) ** 2 for row in observed) if observed else None,
        "coverage": len(observed) / len(records) if records else None,
        "no_observable": len(records) - len(observed),
        "calibration_bins": calibration,
    }


def _percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower, upper = math.floor(position), math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower)


def _bootstrap_metrics(
    records: list[dict[str, Any]],
    *,
    threshold: float,
    bins: int,
    iterations: int,
    seed: int,
) -> dict[str, dict[str, Any]]:
    by_participant: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        by_participant[row["participant_pseudo"]].append(row)
    participant_ids = sorted(by_participant)
    generator = random.Random(seed)
    estimates: dict[str, list[float]] = {metric: [] for metric in METRICS}
    for _ in range(iterations):
        sampled = []
        for participant in generator.choices(participant_ids, k=len(participant_ids)):
            sampled.extend(by_participant[participant])
        values = _binary_metrics(sampled, threshold, bins)
        for metric in METRICS:
            value = values[metric]
            if value is not None and math.isfinite(value):
                estimates[metric].append(value)
    return {
        metric: {
            "ci95_low": _percentile(values, 0.025),
            "ci95_high": _percentile(values, 0.975),
            "iterations_valid": len(values),
            "cluster": "participant",
        }
        for metric, values in estimates.items()
    }


def _eligible(metrics: dict[str, Any], config: dict[str, Any]) -> bool:
    return (
        metrics["participants"] >= int(config["minimum_cell_participants"])
        and metrics["observable_records"] >= int(config["minimum_observable_records"])
        and metrics["positive_labels"] >= int(config["minimum_positive_labels"])
        and metrics["negative_labels"] >= int(config["minimum_negative_labels"])
    )


def _candidate_cells(records: list[dict[str, Any]], dimensions: tuple[str, ...]) -> list[tuple[str, dict[str, str], list[dict[str, Any]]]]:
    candidates: list[tuple[str, dict[str, str], list[dict[str, Any]]]] = [("overall", {}, records)]
    for dimension in dimensions:
        values = sorted({row["groups"][dimension] if row["groups"][dimension] is not None else "missing" for row in records})
        for value in values:
            selected = [row for row in records if (row["groups"][dimension] if row["groups"][dimension] is not None else "missing") == value]
            candidates.append((dimension, {dimension: value}, selected))
    combinations: dict[tuple[str, ...], list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        key = tuple(row["groups"][dimension] if row["groups"][dimension] is not None else "missing" for dimension in dimensions)
        combinations[key].append(row)
    for values in sorted(combinations):
        selector = dict(zip(dimensions, values))
        candidates.append(("intersection", selector, combinations[values]))
    return candidates


def _audit_cells(records: list[dict[str, Any]], config: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    threshold = float(config["common_threshold"])
    bins = int(config["calibration_bins"])
    iterations = int(config["bootstrap_iterations"])
    seed = int(config["bootstrap_seed"])
    published = []
    suppressed_by_scope: dict[str, int] = defaultdict(int)
    evaluated = [
        (scope, selector, selected, _binary_metrics(selected, threshold, bins))
        for scope, selector, selected in _candidate_cells(records, tuple(config["group_dimensions"]))
    ]
    blocked_scopes = {
        scope
        for scope, _, _, point in evaluated
        if scope != "overall" and not _eligible(point, config)
    }
    for index, (scope, selector, selected, point) in enumerate(evaluated):
        # Suppress the entire comparison scope when any component cell fails.
        # This prevents reconstructing a small cell by subtracting released
        # peers from an overall or marginal total.
        if scope in blocked_scopes:
            suppressed_by_scope[scope] += 1
            continue
        intervals = _bootstrap_metrics(
            selected,
            threshold=threshold,
            bins=bins,
            iterations=iterations,
            seed=seed + index * 100,
        )
        published.append({
            "cell_id": f"released-{len(published) + 1:03d}",
            "scope": scope,
            "selector": selector,
            "threshold": threshold,
            "metrics": point,
            "ci95": intervals,
        })
    suppression = {
        "has_suppressed_cells": bool(suppressed_by_scope),
        "suppressed_scopes": sorted(suppressed_by_scope),
        "cell_count_released": False,
        "identities_and_denominators_released": False,
        "reason": "primary or complementary suppression due to minimum participant/outcome/observable thresholds",
        "policy": "suppress_entire_scope_when_any_component_cell_is_ineligible",
    }
    return published, suppression


def _gaps(cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results = []
    scopes = sorted({cell["scope"] for cell in cells if cell["scope"] != "overall"})
    for scope in scopes:
        peers = [cell for cell in cells if cell["scope"] == scope]
        for metric in ("false_positive_rate", "false_negative_rate", "ece", "coverage"):
            values = [(cell["cell_id"], cell["metrics"][metric]) for cell in peers if cell["metrics"][metric] is not None]
            if len(values) < 2:
                continue
            low = min(values, key=lambda item: item[1])
            high = max(values, key=lambda item: item[1])
            results.append({"scope": scope, "metric": metric, "absolute_gap": high[1] - low[1], "lowest_cell_id": low[0], "highest_cell_id": high[0]})
    return results


def _threshold_sensitivity(cells: list[dict[str, Any]], records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    bins = int(config["calibration_bins"])
    thresholds = [float(value) for value in config["sensitivity_thresholds"]]
    candidates = _candidate_cells(records, tuple(config["group_dimensions"]))
    released_selectors = {(cell["scope"], tuple(sorted(cell["selector"].items()))): cell["cell_id"] for cell in cells}
    table = []
    specific = []
    for scope, selector, selected in candidates:
        key = (scope, tuple(sorted(selector.items())))
        if key not in released_selectors:
            continue
        rows = []
        for threshold in thresholds:
            metrics = _binary_metrics(selected, threshold, bins)
            rows.append({
                "threshold": threshold,
                "false_positive_rate": metrics["false_positive_rate"],
                "false_negative_rate": metrics["false_negative_rate"],
                "macro_f1": metrics["macro_f1"],
            })
        table.append({"cell_id": released_selectors[key], "values": rows})
        valid = [row for row in rows if row["false_positive_rate"] is not None and row["false_negative_rate"] is not None]
        if valid:
            chosen = min(valid, key=lambda row: (abs(row["false_positive_rate"] - row["false_negative_rate"]), row["threshold"]))
            specific.append({"cell_id": released_selectors[key], "exploratory_threshold": chosen["threshold"]})
    return {
        "common_threshold_table": table,
        "group_specific_exploratory": specific,
        "application_permitted": False,
        "note": "group-specific thresholds are sensitivity analysis only and must not be applied automatically",
    }


def audit(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    counts = validate_records(records, config)
    cells, suppression = _audit_cells(records, config)
    gaps = _gaps(cells)
    violations = []
    if suppression["has_suppressed_cells"]:
        violations.append("INSUFFICIENT_GROUP_OR_INTERSECTION_EVIDENCE")
    for gap in gaps:
        limit = float(config["maximum_coverage_gap"] if gap["metric"] == "coverage" else config["maximum_error_or_calibration_gap"])
        if gap["absolute_gap"] > limit:
            violations.append(f"GAP_EXCEEDS_LIMIT:{gap['scope']}:{gap['metric']}")
    if any(cell["metrics"]["coverage"] < float(config["minimum_coverage"]) for cell in cells):
        violations.append("COVERAGE_BELOW_MINIMUM")
    return {
        "counts": counts,
        "analysis_unit": "participant_with_repeated_windows",
        "released_cells": cells,
        "suppression": suppression,
        "comparative_gaps": gaps,
        "threshold_sensitivity": _threshold_sensitivity(cells, records, config),
        "deployment_gate": {
            "status": "BLOCK_PROMOTION" if violations else "PASS_TECHNICAL_THRESHOLDS",
            "violations": sorted(set(violations)),
            "automatic_promotion_permitted": False,
        },
        "interpretation": [
            "Insufficient group evidence is not evidence of fairness.",
            "Observed gaps are associations under this protocol and do not establish causes.",
            "Suppressed cells must not be reconstructed from totals or other releases.",
        ],
    }
