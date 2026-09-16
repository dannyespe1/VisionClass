"""Reproducible masked GRU candidate for observable-evidence sequences.

This module is offline-only. It never activates a model or authorizes an
intervention, and it treats non-observable windows as masked sequence steps.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np
import torch
from torch import nn

from ml.baselines import (
    FEATURE_CONTRACT,
    FEATURE_NAMES,
    BaselineConfig,
    WindowLogisticBaseline,
    assign_participant_splits,
    classification_metrics,
    participant_bootstrap_intervals,
    partition_windows,
    select_threshold,
)
from ml.state_model import StateModelArtifact, StateModelConfig, fit_state_model, smooth_sequence


@dataclass(frozen=True)
class GRUBaselineConfig:
    schema_version: str = "masked-gru-baseline-v1"
    split_seed: int = 19017
    validation_fraction: float = 0.2
    test_fraction: float = 0.2
    training_seeds: tuple[int, ...] = (24017, 24023)
    hidden_size: int = 8
    epochs: int = 80
    learning_rate: float = 0.03
    l2_penalty: float = 0.001
    gradient_clip_norm: float = 5.0
    maximum_gap_ms: int = 7500
    bootstrap_iterations: int = 200
    calibration_bins: int = 5
    minimum_sensitivity: float = 0.70
    minimum_specificity: float = 0.80


class MaskedGRUClassifier(nn.Module):
    """GRU whose hidden state resets at protocol-defined segment breaks."""

    def __init__(self, input_size: int, hidden_size: int):
        super().__init__()
        self.cell = nn.GRUCell(input_size, hidden_size)
        self.head = nn.Linear(hidden_size, 1)

    def forward(
        self,
        features: torch.Tensor,
        observable: torch.Tensor,
        reset_before: torch.Tensor | None = None,
    ) -> torch.Tensor:
        hidden = torch.zeros(self.cell.hidden_size, dtype=features.dtype, device=features.device)
        resets = reset_before if reset_before is not None else torch.zeros_like(observable)
        logits = []
        for step in range(features.shape[0]):
            hidden = torch.where(resets[step], torch.zeros_like(hidden), hidden)
            candidate = self.cell(features[step], hidden)
            hidden = torch.where(observable[step], candidate, torch.zeros_like(hidden))
            logits.append(self.head(hidden).squeeze(0))
        return torch.stack(logits)


def validate_config(config: GRUBaselineConfig) -> None:
    if len(set(config.training_seeds)) < 2:
        raise ValueError("at_least_two_training_seeds_required")
    if not 1 <= config.hidden_size <= 1024 or not 1 <= config.epochs <= 10000:
        raise ValueError("invalid_model_size_or_epochs")
    if not 0 < config.learning_rate <= 1 or config.l2_penalty < 0:
        raise ValueError("invalid_optimizer_configuration")
    if config.maximum_gap_ms <= 0:
        raise ValueError("invalid_maximum_gap_ms")
    if config.validation_fraction <= 0 or config.test_fraction <= 0:
        raise ValueError("invalid_split_fractions")
    if config.validation_fraction + config.test_fraction >= 1:
        raise ValueError("invalid_split_fractions")


def run_neural_temporal_baseline(
    records: list[dict[str, Any]], config: GRUBaselineConfig
) -> dict[str, Any]:
    validate_config(config)
    _validate_records(records)
    baseline_config = BaselineConfig(
        seed=config.split_seed,
        validation_fraction=config.validation_fraction,
        test_fraction=config.test_fraction,
        bootstrap_iterations=config.bootstrap_iterations,
        calibration_bins=config.calibration_bins,
        minimum_sensitivity=config.minimum_sensitivity,
        minimum_specificity=config.minimum_specificity,
    )
    assignment = assign_participant_splits((row["participant_id"] for row in records), baseline_config)
    partitions = partition_windows(records, assignment)
    sequences = {name: _sequences(rows) for name, rows in partitions.items()}

    static_model = WindowLogisticBaseline(baseline_config).fit(partitions["train"])
    static_validation = static_model.predict(partitions["validation"])
    static_threshold = select_threshold(static_validation, baseline_config)
    static_threshold_value = float(static_threshold["threshold"] or 0.5)
    static_test = static_model.predict(partitions["test"])
    static_result = _metric_bundle(static_test, static_threshold_value, baseline_config)

    state_test, state_artifact = _state_model_predictions(
        sequences, static_model, StateModelConfig(maximum_gap_ms=7500)
    )
    state_result = _metric_bundle(state_test, 0.5, baseline_config)

    runs = []
    trained_models: dict[int, MaskedGRUClassifier] = {}
    for seed in config.training_seeds:
        model, curves = train_masked_gru(sequences["train"], sequences["validation"], config, seed)
        best_curve = min(curves, key=lambda point: (point["validation_loss"], point["epoch"]))
        validation_predictions = predict_sequences(
            model, sequences["validation"], config.maximum_gap_ms
        )
        threshold_selection = select_threshold(validation_predictions, baseline_config)
        threshold = float(threshold_selection["threshold"] or 0.5)
        test_predictions = predict_sequences(model, sequences["test"], config.maximum_gap_ms)
        metrics = _metric_bundle(test_predictions, threshold, BaselineConfig(
            **{**asdict(baseline_config), "seed": seed}
        ))
        runs.append({
            "seed": seed,
            "selected_epoch": best_curve["epoch"],
            "best_validation_loss": best_curve["validation_loss"],
            "threshold_selection": threshold_selection,
            "training_curve": curves,
            "test": metrics,
            "cost": _cost(model),
        })
        trained_models[seed] = model

    chosen = min(runs, key=lambda run: (run["best_validation_loss"], run["seed"]))
    chosen_model = trained_models[int(chosen["seed"])]
    chosen_metrics = chosen["test"]["metrics"]
    split_digest = hashlib.sha256(json.dumps(assignment, sort_keys=True).encode("utf-8")).hexdigest()
    return {
        "schema_version": config.schema_version,
        "feature_contract": FEATURE_CONTRACT,
        "interpretation": "observable_task_orientation_evidence_not_internal_attention",
        "split_policy": "same_pr19_participant_exclusive_assignment_before_windowing",
        "split_evidence": {
            "assignment_sha256": split_digest,
            "participant_counts": {
                name: len({row["participant_id"] for row in partitions[name]})
                for name in ("train", "validation", "test")
            },
        },
        "config": asdict(config),
        "comparisons": {
            "pr19_window_logistic": {
                "threshold_selection": static_threshold,
                "test": static_result,
                "cost": {
                    "parameter_count": len(FEATURE_NAMES) + 1,
                    "estimated_multiply_accumulates_per_window": len(FEATURE_NAMES),
                    "requires_raw_media": False,
                },
            },
            "pr20_observable_evidence_hmm": {
                "threshold": 0.5,
                "test": state_result,
                "cost": {
                    "parameter_count": 10,
                    "estimated_multiply_accumulates_per_window": 20,
                    "requires_raw_media": False,
                    "artifact_version": state_artifact.artifact_version,
                },
            },
            "masked_gru_runs": runs,
            "variability": _variability(runs),
        },
        "candidate": {
            "artifact_version": "masked-gru-observable-evidence-v1",
            "selected_on": "lowest_best_validation_loss_only",
            "selected_seed": chosen["seed"],
            "threshold_selection": chosen["threshold_selection"],
            "model_state": _model_state(chosen_model),
            "model_state_sha256": _model_state_sha256(chosen_model),
            "mode": "shadow_only",
            "active": False,
            "allow_intervention": False,
            "raw_media_required": False,
            "promotion_status": "SHADOW_ONLY_REQUIRES_REAL_APPROVED_EVALUATION",
            "test_operating_constraints_met": (
                chosen_metrics["sensitivity"] >= config.minimum_sensitivity
                and chosen_metrics["specificity"] >= config.minimum_specificity
            ),
        },
        "non_use_conditions": [
            "not_observable",
            "feature_contract_mismatch",
            "participant_split_not_verifiable",
            "threshold_not_selected_on_validation",
            "real_data_approval_or_consent_missing",
            "automated_intervention_or_diagnostic_use",
        ],
    }


def train_masked_gru(
    train_sequences: list[list[dict[str, Any]]],
    validation_sequences: list[list[dict[str, Any]]],
    config: GRUBaselineConfig,
    seed: int,
) -> tuple[MaskedGRUClassifier, list[dict[str, float | int]]]:
    _set_determinism(seed)
    model = MaskedGRUClassifier(len(FEATURE_NAMES), config.hidden_size)
    optimizer = torch.optim.Adam(
        model.parameters(), lr=config.learning_rate, weight_decay=config.l2_penalty
    )
    criterion = nn.BCEWithLogitsLoss(reduction="sum")
    curves = []
    best_validation_loss = float("inf")
    best_state: dict[str, torch.Tensor] | None = None
    for epoch in range(1, config.epochs + 1):
        model.train()
        optimizer.zero_grad()
        loss_sum, count = _sequence_loss(
            model, train_sequences, criterion, config.maximum_gap_ms
        )
        if count == 0:
            raise ValueError("no_observable_training_windows")
        train_loss = loss_sum / count
        train_loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), config.gradient_clip_norm)
        optimizer.step()
        model.eval()
        with torch.no_grad():
            validation_sum, validation_count = _sequence_loss(
                model, validation_sequences, criterion, config.maximum_gap_ms
            )
        if validation_count == 0:
            raise ValueError("no_observable_validation_windows")
        validation_loss = float(validation_sum / validation_count)
        curves.append({
            "epoch": epoch,
            "train_loss": float(train_loss.detach()),
            "validation_loss": validation_loss,
        })
        if validation_loss < best_validation_loss:
            best_validation_loss = validation_loss
            best_state = {
                name: tensor.detach().clone() for name, tensor in model.state_dict().items()
            }
    if best_state is None:
        raise ValueError("missing_validation_checkpoint")
    model.load_state_dict(best_state)
    return model, curves


def predict_sequences(
    model: MaskedGRUClassifier,
    sequences: list[list[dict[str, Any]]],
    maximum_gap_ms: int = 7500,
) -> list[dict[str, Any]]:
    model.eval()
    predictions = []
    with torch.no_grad():
        for sequence in sequences:
            features, observable, _, resets = _tensors(sequence, maximum_gap_ms)
            probabilities = torch.sigmoid(model(features, observable, resets)).cpu().numpy()
            for row, probability, is_observable in zip(sequence, probabilities, observable.tolist()):
                predictions.append({
                    "participant_id": row["participant_id"],
                    "window_id": row["window_id"],
                    "label": row.get("label"),
                    "probability": float(probability) if is_observable else None,
                })
    return predictions


def _sequence_loss(
    model: MaskedGRUClassifier,
    sequences: list[list[dict[str, Any]]],
    criterion: nn.Module,
    maximum_gap_ms: int,
) -> tuple[torch.Tensor, int]:
    total = torch.zeros((), dtype=torch.float32)
    count = 0
    for sequence in sequences:
        features, observable, labels, resets = _tensors(sequence, maximum_gap_ms)
        logits = model(features, observable, resets)
        if observable.any():
            total = total + criterion(logits[observable], labels[observable])
            count += int(observable.sum())
    return total, count


def _tensors(
    sequence: list[dict[str, Any]], maximum_gap_ms: int
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
    feature_rows = []
    observable_rows = []
    labels = []
    resets = []
    previous: dict[str, Any] | None = None
    for row in sequence:
        observable = (row.get("quality") or {}).get("observable") is True
        features = row.get("features") or {}
        feature_rows.append([
            float(features[name]) if observable else 0.0 for name in FEATURE_NAMES
        ])
        observable_rows.append(observable)
        labels.append(float(row["label"]) if observable else 0.0)
        resets.append(
            previous is None
            or row["timestamp_ms"] - previous["timestamp_ms"] > maximum_gap_ms
            or row.get("edge_profile_generation") != previous.get("edge_profile_generation")
        )
        previous = row
    return (
        torch.tensor(feature_rows, dtype=torch.float32),
        torch.tensor(observable_rows, dtype=torch.bool),
        torch.tensor(labels, dtype=torch.float32),
        torch.tensor(resets, dtype=torch.bool),
    )


def _state_model_predictions(
    sequences: dict[str, list[list[dict[str, Any]]]],
    static_model: WindowLogisticBaseline,
    config: StateModelConfig,
) -> tuple[list[dict[str, Any]], StateModelArtifact]:
    training = [_state_events(sequence, static_model) for sequence in sequences["train"]]
    artifact = fit_state_model(training, config)
    output = []
    for sequence in sequences["test"]:
        events = _state_events(sequence, static_model)
        smoothed = smooth_sequence(events, artifact)
        for row, state in zip(sequence, smoothed):
            observable = (row.get("quality") or {}).get("observable") is True
            output.append({
                "participant_id": row["participant_id"],
                "window_id": row["window_id"],
                "label": row.get("label"),
                "probability": state["posterior"]["task_oriented_evidence"] if observable else None,
            })
    return output, artifact


def _state_events(
    sequence: list[dict[str, Any]], static_model: WindowLogisticBaseline
) -> list[dict[str, Any]]:
    prediction_by_window = {
        prediction["window_id"]: prediction for prediction in static_model.predict(sequence)
    }
    events = []
    for row in sequence:
        label = row.get("label")
        events.append({
            "timestamp_ms": row["timestamp_ms"],
            "probability": prediction_by_window[row["window_id"]]["probability"],
            "observable": (row.get("quality") or {}).get("observable") is True,
            "label": (
                "task_oriented_evidence" if label == 1 else "off_task_evidence" if label == 0 else None
            ),
        })
    return events


def _metric_bundle(
    predictions: list[dict[str, Any]], threshold: float, config: BaselineConfig
) -> dict[str, Any]:
    return {
        "threshold": threshold,
        "metrics": classification_metrics(predictions, threshold, config.calibration_bins),
        "ci95_participant_bootstrap": participant_bootstrap_intervals(predictions, threshold, config),
    }


def _sequences(records: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in records:
        groups.setdefault((row["participant_id"], row["session_id"]), []).append(row)
    return [
        sorted(rows, key=lambda row: row["timestamp_ms"])
        for _, rows in sorted(groups.items())
    ]


def _validate_records(records: list[dict[str, Any]]) -> None:
    if not records:
        raise ValueError("empty_training_records")
    windows: set[str] = set()
    timestamps: dict[tuple[str, str], set[int]] = {}
    for row in records:
        participant = str(row.get("participant_id", "")).strip()
        session = str(row.get("session_id", "")).strip()
        window = str(row.get("window_id", "")).strip()
        timestamp = row.get("timestamp_ms")
        if not participant or not session or not window or not isinstance(timestamp, int):
            raise ValueError("invalid_record_identity")
        if window in windows:
            raise ValueError("duplicate_window_id")
        windows.add(window)
        key = (participant, session)
        if timestamp in timestamps.setdefault(key, set()):
            raise ValueError("duplicate_session_timestamp")
        timestamps[key].add(timestamp)
        observable = (row.get("quality") or {}).get("observable") is True
        if observable:
            if (row.get("quality") or {}).get("pass") is not True:
                raise ValueError("observable_window_requires_quality_pass")
            if row.get("label") not in (0, 1):
                raise ValueError("observable_window_requires_binary_label")
            features = row.get("features") or {}
            if any(name not in features or isinstance(features[name], bool) for name in FEATURE_NAMES):
                raise ValueError("observable_window_requires_feature_contract")
        elif row.get("label") is not None:
            raise ValueError("no_observable_label_must_be_null")


def _set_determinism(seed: int) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)


def _cost(model: MaskedGRUClassifier) -> dict[str, Any]:
    input_size = model.cell.input_size
    hidden_size = model.cell.hidden_size
    return {
        "parameter_count": sum(parameter.numel() for parameter in model.parameters()),
        "parameter_bytes_float32": 4 * sum(parameter.numel() for parameter in model.parameters()),
        "estimated_multiply_accumulates_per_window": 3 * (
            input_size * hidden_size + hidden_size * hidden_size
        ) + hidden_size,
        "requires_raw_media": False,
        "runtime_target": "cpu_shadow_offline_candidate",
    }


def _model_state(model: MaskedGRUClassifier) -> dict[str, Any]:
    return {
        name: tensor.detach().cpu().numpy().round(8).tolist()
        for name, tensor in sorted(model.state_dict().items())
    }


def _model_state_sha256(model: MaskedGRUClassifier) -> str:
    encoded = json.dumps(_model_state(model), sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _variability(runs: list[dict[str, Any]]) -> dict[str, Any]:
    names = ("auroc", "auprc", "sensitivity", "specificity", "brier_score", "ece", "coverage")
    output = {}
    for name in names:
        values = [float(run["test"]["metrics"][name]) for run in runs]
        output[name] = {
            "minimum": min(values),
            "maximum": max(values),
            "mean": float(np.mean(values)),
            "standard_deviation": float(np.std(values)),
        }
    return output
