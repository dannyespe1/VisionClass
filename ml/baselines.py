"""Reproducible, participant-exclusive baselines for observable orientation.

The module consumes normalized feature windows plus an independently supplied
binary label. It never treats ``no_observable`` as a negative class and does
not make claims about internal attention.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
from math import exp
from random import Random
from typing import Any, Iterable

import numpy as np


FEATURE_CONTRACT = "normalized-features-v1"
FEATURE_NAMES = (
    "face_center_x",
    "face_center_y",
    "face_width",
    "face_height",
    "eye_span",
    "head_roll",
    "gaze_horizontal_proxy",
    "pose_available",
    "gaze_available",
)


@dataclass(frozen=True)
class BaselineConfig:
    schema_version: str = "pr19-baselines-v1"
    seed: int = 19017
    validation_fraction: float = 0.2
    test_fraction: float = 0.2
    learning_rate: float = 0.1
    iterations: int = 800
    l2_penalty: float = 0.01
    bootstrap_iterations: int = 200
    calibration_bins: int = 5
    minimum_sensitivity: float = 0.70
    minimum_specificity: float = 0.80


def validate_config(config: BaselineConfig) -> None:
    if not 0 < config.validation_fraction < 1 or not 0 < config.test_fraction < 1:
        raise ValueError("split_fractions_must_be_between_zero_and_one")
    if config.validation_fraction + config.test_fraction >= 1:
        raise ValueError("split_fractions_leave_no_training_data")
    if not 0 < config.learning_rate <= 1:
        raise ValueError("invalid_learning_rate")
    if not 1 <= config.iterations <= 100_000:
        raise ValueError("invalid_iterations")
    if not 0 <= config.l2_penalty <= 1:
        raise ValueError("invalid_l2_penalty")
    if not 1 <= config.bootstrap_iterations <= 100_000:
        raise ValueError("invalid_bootstrap_iterations")
    if not 1 <= config.calibration_bins <= 100:
        raise ValueError("invalid_calibration_bins")
    if not 0 <= config.minimum_sensitivity <= 1 or not 0 <= config.minimum_specificity <= 1:
        raise ValueError("invalid_operating_constraints")


def assign_participant_splits(participant_ids: Iterable[str], config: BaselineConfig) -> dict[str, str]:
    """Assign participants before any window generation or model fitting."""
    validate_config(config)
    participants = sorted(set(participant_ids), key=lambda value: _stable_key(value, config.seed))
    if len(participants) < 5:
        raise ValueError("at_least_five_participants_required")
    n_test = max(1, round(len(participants) * config.test_fraction))
    n_validation = max(1, round(len(participants) * config.validation_fraction))
    if n_test + n_validation > len(participants) - 2:
        raise ValueError("insufficient_training_participants")
    assignment: dict[str, str] = {}
    for participant in participants[:n_test]:
        assignment[participant] = "test"
    for participant in participants[n_test : n_test + n_validation]:
        assignment[participant] = "validation"
    for participant in participants[n_test + n_validation :]:
        assignment[participant] = "train"
    return assignment


def partition_windows(records: list[dict[str, Any]], assignment: dict[str, str]) -> dict[str, list[dict[str, Any]]]:
    partitions = {"train": [], "validation": [], "test": []}
    seen_windows: set[str] = set()
    for record in records:
        participant = _participant(record)
        if participant not in assignment:
            raise ValueError("participant_without_split")
        window_id = str(record.get("window_id", "")).strip()
        if not window_id or window_id in seen_windows:
            raise ValueError("missing_or_duplicate_window_id")
        seen_windows.add(window_id)
        partitions[assignment[participant]].append(record)
    for split_records in partitions.values():
        split_records.sort(key=lambda item: (_participant(item), str(item["window_id"])))
    assert_no_participant_leakage(partitions)
    return partitions


def assert_no_participant_leakage(partitions: dict[str, list[dict[str, Any]]]) -> None:
    participant_sets = {
        name: {_participant(record) for record in records}
        for name, records in partitions.items()
    }
    names = sorted(participant_sets)
    for index, left in enumerate(names):
        for right in names[index + 1 :]:
            if participant_sets[left] & participant_sets[right]:
                raise ValueError(f"participant_leakage:{left}:{right}")


class WindowLogisticBaseline:
    """Small deterministic logistic classifier with no hidden dependencies."""

    def __init__(self, config: BaselineConfig):
        self.config = config
        self.mean_: np.ndarray | None = None
        self.scale_: np.ndarray | None = None
        self.weights_: np.ndarray | None = None
        self.bias_: float | None = None

    def fit(self, records: list[dict[str, Any]]) -> "WindowLogisticBaseline":
        matrix, labels, _ = _observable_matrix(records)
        if len(set(labels.tolist())) != 2:
            raise ValueError("training_requires_both_classes")
        self.mean_ = matrix.mean(axis=0)
        self.scale_ = matrix.std(axis=0)
        self.scale_[self.scale_ < 1e-12] = 1.0
        normalized = (matrix - self.mean_) / self.scale_
        weights = np.zeros(normalized.shape[1], dtype=np.float64)
        bias = 0.0
        for _ in range(self.config.iterations):
            probabilities = _sigmoid(normalized @ weights + bias)
            error = probabilities - labels
            weights -= self.config.learning_rate * (
                normalized.T @ error / len(labels) + self.config.l2_penalty * weights
            )
            bias -= self.config.learning_rate * float(error.mean())
        self.weights_ = weights
        self.bias_ = bias
        return self

    def predict(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if self.mean_ is None or self.scale_ is None or self.weights_ is None or self.bias_ is None:
            raise ValueError("model_not_fitted")
        output = []
        for record in records:
            if not _is_observable(record):
                output.append(_prediction(record, None, "no_observable"))
                continue
            vector = _feature_vector(record)
            probability = float(_sigmoid(((vector - self.mean_) / self.scale_) @ self.weights_ + self.bias_))
            output.append(_prediction(record, probability, None))
        return output

    def artifact(self) -> dict[str, Any]:
        if self.mean_ is None or self.scale_ is None or self.weights_ is None or self.bias_ is None:
            raise ValueError("model_not_fitted")
        return {
            "artifact_version": "window-logistic-v1",
            "feature_contract": FEATURE_CONTRACT,
            "feature_names": list(FEATURE_NAMES),
            "mean": self.mean_.round(12).tolist(),
            "scale": self.scale_.round(12).tolist(),
            "weights": self.weights_.round(12).tolist(),
            "bias": round(self.bias_, 12),
            "config": asdict(self.config),
        }


def heuristic_predictions(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output = []
    for record in records:
        if not _is_observable(record):
            output.append(_prediction(record, None, "no_observable"))
            continue
        features = record["features"]
        checks = (
            0.25 <= float(features["face_center_x"]) <= 0.75,
            0.15 <= float(features["face_center_y"]) <= 0.75,
            abs(float(features["head_roll"])) <= 0.35,
            0.30 <= float(features["gaze_horizontal_proxy"]) <= 0.70,
        )
        output.append(_prediction(record, 0.75 if all(checks) else 0.25, None))
    return output


def select_threshold(predictions: list[dict[str, Any]], config: BaselineConfig) -> dict[str, Any]:
    eligible = [item for item in predictions if item["probability"] is not None]
    candidates = sorted({float(item["probability"]) for item in eligible})
    for threshold in candidates:
        metrics = classification_metrics(eligible, threshold, config.calibration_bins)
        if (
            metrics["sensitivity"] >= config.minimum_sensitivity
            and metrics["specificity"] >= config.minimum_specificity
        ):
            return {"status": "PASS", "threshold": threshold, "selection_split": "validation"}
    return {"status": "FAIL_NO_THRESHOLD", "threshold": None, "selection_split": "validation"}


def classification_metrics(
    predictions: list[dict[str, Any]], threshold: float, calibration_bins: int
) -> dict[str, Any]:
    eligible = [item for item in predictions if item["probability"] is not None]
    if not eligible:
        raise ValueError("no_observable_predictions")
    labels = np.asarray([int(item["label"]) for item in eligible], dtype=np.int64)
    probabilities = np.asarray([float(item["probability"]) for item in eligible], dtype=np.float64)
    predicted = (probabilities >= threshold).astype(np.int64)
    tp = int(((predicted == 1) & (labels == 1)).sum())
    tn = int(((predicted == 0) & (labels == 0)).sum())
    fp = int(((predicted == 1) & (labels == 0)).sum())
    fn = int(((predicted == 0) & (labels == 1)).sum())
    sensitivity = _safe_div(tp, tp + fn)
    specificity = _safe_div(tn, tn + fp)
    f1_positive = _f1(tp, fp, fn)
    f1_negative = _f1(tn, fn, fp)
    return {
        "macro_f1": (f1_positive + f1_negative) / 2,
        "balanced_accuracy": (sensitivity + specificity) / 2,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "brier_score": float(np.mean((probabilities - labels) ** 2)),
        "ece": _ece(labels, probabilities, calibration_bins),
        "auroc": _auroc(labels, probabilities),
        "auprc": _auprc(labels, probabilities),
        "prevalence": float(labels.mean()),
        "coverage": len(eligible) / len(predictions),
        "eligible_windows": len(eligible),
        "total_windows": len(predictions),
        "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
    }


def participant_bootstrap_intervals(
    predictions: list[dict[str, Any]], threshold: float, config: BaselineConfig
) -> dict[str, list[float] | None]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for item in predictions:
        groups.setdefault(item["participant_id"], []).append(item)
    participants = sorted(groups)
    random = Random(config.seed)
    interval_metrics = (
        "macro_f1",
        "balanced_accuracy",
        "sensitivity",
        "specificity",
        "brier_score",
        "ece",
        "auroc",
        "auprc",
        "prevalence",
        "coverage",
    )
    samples: dict[str, list[float]] = {name: [] for name in interval_metrics}
    for _ in range(config.bootstrap_iterations):
        sampled: list[dict[str, Any]] = []
        for draw_index in range(len(participants)):
            participant = participants[random.randrange(len(participants))]
            for item in groups[participant]:
                sampled.append({**item, "participant_id": f"draw-{draw_index}"})
        try:
            metrics = classification_metrics(sampled, threshold, config.calibration_bins)
        except ValueError:
            continue
        for name in samples:
            samples[name].append(float(metrics[name]))
    return {
        name: ([float(np.quantile(values, 0.025)), float(np.quantile(values, 0.975))] if values else None)
        for name, values in samples.items()
    }


def run_baselines(records: list[dict[str, Any]], config: BaselineConfig) -> dict[str, Any]:
    validate_config(config)
    participants = [_participant(record) for record in records]
    assignment = assign_participant_splits(participants, config)
    partitions = partition_windows(records, assignment)
    classifier = WindowLogisticBaseline(config).fit(partitions["train"])
    validation_predictions = classifier.predict(partitions["validation"])
    threshold_selection = select_threshold(validation_predictions, config)
    if threshold_selection["threshold"] is None:
        threshold = 0.5
    else:
        threshold = float(threshold_selection["threshold"])
    test_classifier = classifier.predict(partitions["test"])
    test_heuristic = heuristic_predictions(partitions["test"])
    return {
        "schema_version": config.schema_version,
        "feature_contract": FEATURE_CONTRACT,
        "interpretation": "observable_task_orientation_not_internal_attention",
        "split_policy": "participant_exclusive_assignment_before_windowing",
        "splits": {
            name: sorted(participant for participant, split in assignment.items() if split == name)
            for name in ("train", "validation", "test")
        },
        "threshold_selection": threshold_selection,
        "window_classifier": {
            "artifact": classifier.artifact(),
            "metrics": classification_metrics(test_classifier, threshold, config.calibration_bins),
            "ci95_participant_bootstrap": participant_bootstrap_intervals(test_classifier, threshold, config),
        },
        "heuristic_rule": {
            "artifact_version": "centered-pose-rule-v1",
            "threshold": 0.5,
            "metrics": classification_metrics(test_heuristic, 0.5, config.calibration_bins),
            "ci95_participant_bootstrap": participant_bootstrap_intervals(test_heuristic, 0.5, config),
        },
    }


def _participant(record: dict[str, Any]) -> str:
    value = str(record.get("participant_id", "")).strip()
    if not value:
        raise ValueError("missing_participant_id")
    return value


def _is_observable(record: dict[str, Any]) -> bool:
    return (record.get("quality") or {}).get("observable") is True


def _feature_vector(record: dict[str, Any]) -> np.ndarray:
    features = record.get("features") or {}
    values = []
    for name in FEATURE_NAMES:
        value = features.get(name)
        if value is None or isinstance(value, bool):
            raise ValueError(f"missing_feature:{name}")
        values.append(float(value))
    return np.asarray(values, dtype=np.float64)


def _observable_matrix(records: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray, list[str]]:
    observable = [record for record in records if _is_observable(record)]
    if not observable:
        raise ValueError("no_observable_training_windows")
    labels = []
    for record in observable:
        label = record.get("label")
        if label not in (0, 1):
            raise ValueError("observable_window_requires_binary_label")
        labels.append(int(label))
    return (
        np.vstack([_feature_vector(record) for record in observable]),
        np.asarray(labels, dtype=np.float64),
        [_participant(record) for record in observable],
    )


def _prediction(record: dict[str, Any], probability: float | None, reason: str | None) -> dict[str, Any]:
    return {
        "participant_id": _participant(record),
        "window_id": str(record["window_id"]),
        "label": record.get("label"),
        "probability": probability,
        "reason": reason,
    }


def _stable_key(value: str, seed: int) -> str:
    return sha256(f"{seed}:{value}".encode("utf-8")).hexdigest()


def _sigmoid(value: np.ndarray | float) -> np.ndarray | float:
    if np.isscalar(value):
        scalar = float(value)
        return 1.0 / (1.0 + exp(-max(-40.0, min(40.0, scalar))))
    clipped = np.clip(value, -40.0, 40.0)
    return 1.0 / (1.0 + np.exp(-clipped))


def _safe_div(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def _f1(true_positive: int, false_positive: int, false_negative: int) -> float:
    return _safe_div(2 * true_positive, 2 * true_positive + false_positive + false_negative)


def _ece(labels: np.ndarray, probabilities: np.ndarray, bins: int) -> float:
    order = np.argsort(probabilities)
    chunks = [chunk for chunk in np.array_split(order, min(bins, len(order))) if len(chunk)]
    return float(sum(len(chunk) / len(order) * abs(probabilities[chunk].mean() - labels[chunk].mean()) for chunk in chunks))


def _auroc(labels: np.ndarray, probabilities: np.ndarray) -> float:
    positive = probabilities[labels == 1]
    negative = probabilities[labels == 0]
    if not len(positive) or not len(negative):
        return 0.0
    comparisons = [(p > n) + 0.5 * (p == n) for p in positive for n in negative]
    return float(np.mean(comparisons))


def _auprc(labels: np.ndarray, probabilities: np.ndarray) -> float:
    if not int(labels.sum()):
        return 0.0
    order = np.argsort(-probabilities)
    ordered = labels[order]
    true_positives = np.cumsum(ordered)
    precision = true_positives / np.arange(1, len(ordered) + 1)
    return float((precision * ordered).sum() / ordered.sum())
