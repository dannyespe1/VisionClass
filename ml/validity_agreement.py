"""PR32 agreement and convergent-validity analysis.

The unit of inference is the participant. Window-level observations remain
nested within participant/session and are never treated as independent sample
size. The module measures association only; it does not infer causality or an
internal cognitive state.
"""

from __future__ import annotations

import math
import random
import re
from collections import Counter, defaultdict
from statistics import mean
from typing import Any, Callable


OBSERVER_LABELS = ("attentive", "distracted", "no_observable", "uncertain")
SELF_REPORTS = ("focused", "distracted", "unsure", "omitted")
OPAQUE_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")
REQUIRED_FIELDS = {
    "participant_pseudo", "session_id", "phase_index", "timestamp_ms",
    "observer_a", "observer_b", "inference_probability", "self_report_prompted",
    "self_report", "interaction_count", "micro_assessment_correct", "observable",
    "quality_reason",
}


def validate_records(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, int]:
    if not records:
        raise ValueError("empty_analysis_dataset")
    seen: set[tuple[str, str, int]] = set()
    participants: set[str] = set()
    sessions: set[tuple[str, str]] = set()
    expected_phases = set(range(1, int(config["phase_count"]) + 1))
    phases_by_session: dict[tuple[str, str], set[int]] = defaultdict(set)
    timestamps_by_session: dict[tuple[str, str], dict[int, int]] = defaultdict(dict)

    for row in records:
        if set(row) != REQUIRED_FIELDS:
            raise ValueError("invalid_analysis_fields")
        participant = row["participant_pseudo"]
        session = row["session_id"]
        phase = row["phase_index"]
        if (
            not isinstance(participant, str) or OPAQUE_ID.fullmatch(participant) is None
            or not isinstance(session, str) or OPAQUE_ID.fullmatch(session) is None
        ):
            raise ValueError("invalid_pseudonymous_identity")
        if not isinstance(phase, int) or phase not in expected_phases:
            raise ValueError("invalid_phase_index")
        key = (participant, session, phase)
        if key in seen:
            raise ValueError("duplicate_participant_session_phase")
        seen.add(key)
        participants.add(participant)
        sessions.add((participant, session))
        phases_by_session[(participant, session)].add(phase)
        if not isinstance(row["timestamp_ms"], int) or row["timestamp_ms"] < 0:
            raise ValueError("invalid_timestamp_ms")
        timestamps_by_session[(participant, session)][phase] = row["timestamp_ms"]
        if row["observer_a"] not in OBSERVER_LABELS or row["observer_b"] not in OBSERVER_LABELS:
            raise ValueError("invalid_observer_label")
        if not isinstance(row["observable"], bool):
            raise ValueError("invalid_observable_flag")
        probability = row["inference_probability"]
        if row["observable"]:
            if probability is None or isinstance(probability, bool) or not 0 <= float(probability) <= 1:
                raise ValueError("invalid_inference_probability")
            if row["quality_reason"] is not None:
                raise ValueError("observable_cannot_have_quality_reason")
        elif probability is not None or not isinstance(row["quality_reason"], str) or not row["quality_reason"]:
            raise ValueError("no_observable_requires_reason_and_null_probability")
        prompted = row["self_report_prompted"]
        response = row["self_report"]
        if not isinstance(prompted, bool):
            raise ValueError("invalid_self_report_prompt_flag")
        if prompted and response not in SELF_REPORTS:
            raise ValueError("prompted_self_report_requires_explicit_response")
        if not prompted and response is not None:
            raise ValueError("unprompted_self_report_must_be_null")
        count = row["interaction_count"]
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            raise ValueError("invalid_interaction_count")
        micro_value = row["micro_assessment_correct"]
        if micro_value is not None and type(micro_value) is not bool:
            raise ValueError("invalid_micro_assessment_value")

    if any(phases != expected_phases for phases in phases_by_session.values()):
        raise ValueError("incomplete_session_phases")
    if any(
        any(timestamps[phase] >= timestamps[phase + 1] for phase in range(1, int(config["phase_count"])))
        for timestamps in timestamps_by_session.values()
    ):
        raise ValueError("non_monotonic_session_timestamps")
    minimum = int(config["minimum_participants"])
    maximum = int(config["maximum_participants"])
    participant_count = len(participants)
    if participant_count < minimum:
        raise ValueError("insufficient_participant_sample")
    if participant_count > maximum:
        raise ValueError("participant_sample_exceeds_protocol")
    return {"participants": participant_count, "sessions": len(sessions), "records": len(records)}


def _cohen_kappa(pairs: list[tuple[str, str]], categories: tuple[str, ...]) -> dict[str, Any]:
    if not pairs:
        return {"value": None, "observed_agreement": None, "expected_agreement": None, "pairs": 0}
    total = len(pairs)
    observed = sum(left == right for left, right in pairs) / total
    left_counts = Counter(left for left, _ in pairs)
    right_counts = Counter(right for _, right in pairs)
    expected = sum((left_counts[item] / total) * (right_counts[item] / total) for item in categories)
    value = None if math.isclose(expected, 1.0) else (observed - expected) / (1 - expected)
    return {"value": value, "observed_agreement": observed, "expected_agreement": expected, "pairs": total}


def _percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower)


def _cluster_bootstrap(
    participant_values: dict[str, list[Any]],
    statistic: Callable[[list[Any]], float | None],
    *,
    iterations: int,
    seed: int,
) -> dict[str, Any]:
    participant_ids = sorted(participant_values)
    if len(participant_ids) < 2:
        return {"ci95_low": None, "ci95_high": None, "iterations_valid": 0, "cluster": "participant"}
    generator = random.Random(seed)
    estimates: list[float] = []
    for _ in range(iterations):
        sample: list[Any] = []
        for participant in generator.choices(participant_ids, k=len(participant_ids)):
            sample.extend(participant_values[participant])
        value = statistic(sample)
        if value is not None and math.isfinite(value):
            estimates.append(value)
    return {
        "ci95_low": _percentile(estimates, 0.025),
        "ci95_high": _percentile(estimates, 0.975),
        "iterations_valid": len(estimates),
        "cluster": "participant",
    }


def _prevalence(values: list[str], categories: tuple[str, ...]) -> dict[str, Any]:
    counts = Counter(values)
    total = len(values)
    return {
        item: {"count": counts[item], "proportion": counts[item] / total if total else None}
        for item in categories
    }


def agreement_analysis(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    raw_pairs = [(row["observer_a"], row["observer_b"]) for row in records]
    binary_pairs = [pair for pair in raw_pairs if pair[0] in {"attentive", "distracted"} and pair[1] in {"attentive", "distracted"}]
    by_participant_raw: dict[str, list[tuple[str, str]]] = defaultdict(list)
    by_participant_binary: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for row, pair in zip(records, raw_pairs):
        by_participant_raw[row["participant_pseudo"]].append(pair)
        if pair[0] in {"attentive", "distracted"} and pair[1] in {"attentive", "distracted"}:
            by_participant_binary[row["participant_pseudo"]].append(pair)
    iterations = int(config["bootstrap_iterations"])
    seed = int(config["bootstrap_seed"])

    raw = _cohen_kappa(raw_pairs, OBSERVER_LABELS)
    raw["participants"] = len(by_participant_raw)
    raw["ci95"] = _cluster_bootstrap(
        by_participant_raw,
        lambda values: _cohen_kappa(values, OBSERVER_LABELS)["value"],
        iterations=iterations,
        seed=seed,
    )
    binary_categories = ("attentive", "distracted")
    binary = _cohen_kappa(binary_pairs, binary_categories)
    binary["participants"] = len(by_participant_binary)
    binary["ci95"] = _cluster_bootstrap(
        by_participant_binary,
        lambda values: _cohen_kappa(values, binary_categories)["value"],
        iterations=iterations,
        seed=seed + 1,
    )
    return {
        "unit": "phase_nested_in_session_and_participant",
        "method": "cohen_kappa_with_participant_cluster_bootstrap",
        "all_categories": raw,
        "observable_binary_subset": binary,
        "prevalence": {
            "observer_a": _prevalence([pair[0] for pair in raw_pairs], OBSERVER_LABELS),
            "observer_b": _prevalence([pair[1] for pair in raw_pairs], OBSERVER_LABELS),
        },
    }


def _pearson(pairs: list[tuple[float, float]]) -> float | None:
    if len(pairs) < 3:
        return None
    xs = [pair[0] for pair in pairs]
    ys = [pair[1] for pair in pairs]
    x_mean, y_mean = mean(xs), mean(ys)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in pairs)
    x_ss = sum((x - x_mean) ** 2 for x in xs)
    y_ss = sum((y - y_mean) ** 2 for y in ys)
    if math.isclose(x_ss, 0.0) or math.isclose(y_ss, 0.0):
        return None
    return numerator / math.sqrt(x_ss * y_ss)


def _binary_performance(pairs: list[tuple[float, float]], config: dict[str, Any]) -> dict[str, Any]:
    threshold = float(config["frozen_threshold"])
    tp = sum(probability >= threshold and label == 1 for probability, label in pairs)
    tn = sum(probability < threshold and label == 0 for probability, label in pairs)
    fp = sum(probability >= threshold and label == 0 for probability, label in pairs)
    fn = sum(probability < threshold and label == 1 for probability, label in pairs)
    bins = int(config["calibration_bins"])
    calibration = []
    weighted_error = 0.0
    for index in range(bins):
        low, high = index / bins, (index + 1) / bins
        selected = [(probability, label) for probability, label in pairs if low <= probability < high or (index == bins - 1 and probability == 1)]
        if not selected:
            continue
        predicted = mean(probability for probability, _ in selected)
        observed = mean(label for _, label in selected)
        weighted_error += len(selected) / len(pairs) * abs(predicted - observed)
        calibration.append({"lower": low, "upper": high, "n": len(selected), "predicted_mean": predicted, "observed_rate": observed})
    return {
        "threshold": threshold,
        "threshold_provenance": "frozen_configuration_not_selected_on_analysis_data",
        "confusion": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "sensitivity": tp / (tp + fn) if tp + fn else None,
        "specificity": tn / (tn + fp) if tn + fp else None,
        "brier": mean((probability - label) ** 2 for probability, label in pairs) if pairs else None,
        "ece": weighted_error if pairs else None,
        "calibration_bins": calibration,
    }


def _anchor(row: dict[str, Any], name: str) -> float | None:
    if name == "self_report":
        return {"focused": 1.0, "distracted": 0.0}.get(row["self_report"])
    if name == "observer_consensus":
        if row["observer_a"] == row["observer_b"] == "attentive":
            return 1.0
        if row["observer_a"] == row["observer_b"] == "distracted":
            return 0.0
        return None
    if name == "micro_assessment":
        value = row["micro_assessment_correct"]
        return None if value is None else float(value)
    if name == "interaction_count":
        return float(row["interaction_count"])
    raise ValueError("unknown_anchor")


def _lag_pairs(records: list[dict[str, Any]], anchor_name: str, lag: int) -> dict[str, list[tuple[float, float]]]:
    indexed = {(row["participant_pseudo"], row["session_id"], row["phase_index"]): row for row in records}
    result: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for anchor_row in records:
        anchor_value = _anchor(anchor_row, anchor_name)
        if anchor_value is None:
            continue
        inference_row = indexed.get((anchor_row["participant_pseudo"], anchor_row["session_id"], anchor_row["phase_index"] + lag))
        if not inference_row or inference_row["inference_probability"] is None:
            continue
        result[anchor_row["participant_pseudo"]].append((float(inference_row["inference_probability"]), anchor_value))
    return result


def convergent_analysis(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    iterations = int(config["bootstrap_iterations"])
    seed = int(config["bootstrap_seed"])
    for anchor_index, anchor_name in enumerate(("self_report", "observer_consensus", "interaction_count", "micro_assessment")):
        lag_results = {}
        for lag in (-1, 0, 1):
            grouped = _lag_pairs(records, anchor_name, lag)
            pairs = [pair for participant in sorted(grouped) for pair in grouped[participant]]
            association = _pearson(pairs)
            lag_results[str(lag)] = {
                "association": "pearson_r",
                "value": association,
                "pairs": len(pairs),
                "participants": len(grouped),
                "ci95": _cluster_bootstrap(
                    grouped,
                    _pearson,
                    iterations=iterations,
                    seed=seed + 10 + anchor_index * 3 + lag,
                ),
                "temporal_interpretation": "exploratory_association_not_causality" if lag else "concurrent_association_not_construct_equivalence",
            }
            if lag == 0 and anchor_name != "interaction_count":
                lag_results[str(lag)]["classification_and_calibration"] = _binary_performance(pairs, config)
        result[anchor_name] = {
            "anchor_definition": {
                "self_report": "focused=1,distracted=0; unsure and omitted excluded",
                "observer_consensus": "both observers agree attentive=1 or distracted=0",
                "interaction_count": "minimized event count; behavioral activity only",
                "micro_assessment": "correct=1,incorrect=0; distal academic outcome",
            }[anchor_name],
            "lags_in_phases": lag_results,
        }
    return result


def missingness_and_discrepancies(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    threshold = float(config["frozen_threshold"])
    prompted = [row for row in records if row["self_report_prompted"]]
    consensus = [row for row in records if row["observer_a"] == row["observer_b"] and row["observer_a"] in {"attentive", "distracted"}]
    model_disagreement = sum(
        (row["inference_probability"] >= threshold) != (row["observer_a"] == "attentive")
        for row in consensus
        if row["inference_probability"] is not None
    )
    self_observer_rows = [
        row for row in consensus
        if row["self_report"] in {"focused", "distracted"}
    ]
    self_observer_disagreement = sum(
        (row["self_report"] == "focused") != (row["observer_a"] == "attentive")
        for row in self_observer_rows
    )
    reasons = Counter(row["quality_reason"] for row in records if not row["observable"])
    return {
        "self_report": {
            "prompted": len(prompted),
            "focused": sum(row["self_report"] == "focused" for row in prompted),
            "distracted": sum(row["self_report"] == "distracted" for row in prompted),
            "unsure": sum(row["self_report"] == "unsure" for row in prompted),
            "omitted": sum(row["self_report"] == "omitted" for row in prompted),
        },
        "observer_disagreements": sum(row["observer_a"] != row["observer_b"] for row in records),
        "model_vs_observer_consensus_disagreements": model_disagreement,
        "self_report_vs_observer_consensus_disagreements": self_observer_disagreement,
        "self_report_vs_observer_comparable_rows": len(self_observer_rows),
        "no_observable": {"count": sum(not row["observable"] for row in records), "reasons": dict(sorted(reasons.items()))},
        "interpretation": "describe_discrepancies_and_nonresponse_without_causal_attribution",
    }


def analyze(records: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    counts = validate_records(records, config)
    return {
        "analysis_unit": "participant_with_repeated_phases",
        "counts": counts,
        "sample_size_gate": {
            "status": "PASS_NUMERIC_REQUIREMENT",
            "minimum_participants": config["minimum_participants"],
            "maximum_participants": config["maximum_participants"],
            "note": "numeric sufficiency does not establish representativeness or approval",
        },
        "agreement": agreement_analysis(records, config),
        "convergent_validity": convergent_analysis(records, config),
        "missingness_and_discrepancies": missingness_and_discrepancies(records, config),
        "required_ui_disclosure": [
            "Associations do not prove causality or measure internal attention directly.",
            "Self-report, visible orientation, interaction, micro-assessment and model inference are distinct constructs.",
            "Show participant counts, paired-observation counts, uncertainty, missingness and no_observable with every estimate.",
        ],
    }
