"""Versioned HMM for observable orientation evidence, never internal attention."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import exp, log, pi, sqrt
from typing import Any

import numpy as np


STATE_NAMES = ("off_task_evidence", "task_oriented_evidence")
NO_OBSERVABLE = "no_observable"


@dataclass(frozen=True)
class StateModelConfig:
    schema_version: str = "state-model-v1"
    transition_smoothing: float = 1.0
    initial_smoothing: float = 1.0
    minimum_variance: float = 0.0025
    maximum_gap_ms: int = 7500


@dataclass(frozen=True)
class StateModelArtifact:
    artifact_version: str
    state_names: tuple[str, ...]
    initial: tuple[float, ...]
    transition: tuple[tuple[float, ...], ...]
    emission_mean: tuple[float, ...]
    emission_variance: tuple[float, ...]
    config: StateModelConfig

    def as_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["state_names"] = list(self.state_names)
        payload["initial"] = list(self.initial)
        payload["transition"] = [list(row) for row in self.transition]
        payload["emission_mean"] = list(self.emission_mean)
        payload["emission_variance"] = list(self.emission_variance)
        payload["interpretation"] = "latent_observable_evidence_not_internal_attention"
        payload["no_observable_policy"] = "segment_break_without_emission_or_imputation"
        return payload


def validate_config(config: StateModelConfig) -> None:
    if not 0 < config.transition_smoothing <= 100:
        raise ValueError("invalid_transition_smoothing")
    if not 0 < config.initial_smoothing <= 100:
        raise ValueError("invalid_initial_smoothing")
    if not 0 < config.minimum_variance <= 0.25:
        raise ValueError("invalid_minimum_variance")
    if not 1 <= config.maximum_gap_ms <= 3_600_000:
        raise ValueError("invalid_maximum_gap_ms")


def fit_state_model(
    sequences: list[list[dict[str, Any]]], config: StateModelConfig
) -> StateModelArtifact:
    """Estimate supervised HMM parameters from approved observable labels."""
    validate_config(config)
    state_index = {name: index for index, name in enumerate(STATE_NAMES)}
    initial_counts = np.full(len(STATE_NAMES), config.initial_smoothing, dtype=np.float64)
    transition_counts = np.full(
        (len(STATE_NAMES), len(STATE_NAMES)), config.transition_smoothing, dtype=np.float64
    )
    emissions: list[list[float]] = [[] for _ in STATE_NAMES]

    for sequence in sequences:
        _validate_order(sequence)
        previous_state: int | None = None
        previous_timestamp: int | None = None
        for event in sequence:
            timestamp = _timestamp(event)
            if previous_timestamp is not None and timestamp - previous_timestamp > config.maximum_gap_ms:
                previous_state = None
            previous_timestamp = timestamp
            if not _observable(event):
                previous_state = None
                continue
            label = event.get("label")
            if label not in state_index:
                raise ValueError("observable_event_requires_known_label")
            probability = _probability(event)
            current_state = state_index[label]
            if previous_state is None:
                initial_counts[current_state] += 1
            else:
                transition_counts[previous_state, current_state] += 1
            emissions[current_state].append(probability)
            previous_state = current_state

    if any(not values for values in emissions):
        raise ValueError("training_requires_emissions_for_every_state")
    initial = initial_counts / initial_counts.sum()
    transition = transition_counts / transition_counts.sum(axis=1, keepdims=True)
    means = np.asarray([np.mean(values) for values in emissions], dtype=np.float64)
    variances = np.asarray(
        [max(float(np.var(values)), config.minimum_variance) for values in emissions],
        dtype=np.float64,
    )
    return StateModelArtifact(
        artifact_version="observable-evidence-hmm-v1",
        state_names=STATE_NAMES,
        initial=tuple(float(value) for value in initial),
        transition=tuple(tuple(float(value) for value in row) for row in transition),
        emission_mean=tuple(float(value) for value in means),
        emission_variance=tuple(float(value) for value in variances),
        config=config,
    )


class EvidenceStateFilter:
    """Online forward filter with explicit reset and ordering guarantees."""

    def __init__(self, artifact: StateModelArtifact):
        self.artifact = artifact
        self.initial = np.asarray(artifact.initial, dtype=np.float64)
        self.transition = np.asarray(artifact.transition, dtype=np.float64)
        self.means = np.asarray(artifact.emission_mean, dtype=np.float64)
        self.variances = np.asarray(artifact.emission_variance, dtype=np.float64)
        _validate_artifact(self.initial, self.transition, self.means, self.variances)
        self.posterior = self.initial.copy()
        self.last_timestamp: int | None = None
        self.segment_active = False

    def reset(self) -> None:
        self.posterior = self.initial.copy()
        self.last_timestamp = None
        self.segment_active = False

    def update(self, event: dict[str, Any]) -> dict[str, Any]:
        timestamp = _timestamp(event)
        if self.last_timestamp is not None and timestamp <= self.last_timestamp:
            raise ValueError("event_out_of_order")
        reset_reason = None
        if (
            self.segment_active
            and self.last_timestamp is not None
            and timestamp - self.last_timestamp > self.artifact.config.maximum_gap_ms
        ):
            self.posterior = self.initial.copy()
            reset_reason = "gap_reset"
        elif self.segment_active:
            self.posterior = self.posterior @ self.transition
        self.last_timestamp = timestamp

        if not _observable(event):
            result = _state_output(self.artifact, self.posterior, NO_OBSERVABLE, reset_reason)
            self.posterior = self.initial.copy()
            self.segment_active = False
            return result

        likelihood = _emission_likelihood(
            _probability(event), self.means, self.variances
        )
        self.posterior = _normalize(self.posterior * likelihood)
        self.segment_active = True
        state = self.artifact.state_names[int(np.argmax(self.posterior))]
        return _state_output(self.artifact, self.posterior, state, reset_reason)


def smooth_sequence(
    events: list[dict[str, Any]], artifact: StateModelArtifact
) -> list[dict[str, Any]]:
    """Forward-backward smoothing; gaps and no-observable cut segments."""
    _validate_order(events)
    initial = np.asarray(artifact.initial, dtype=np.float64)
    transition = np.asarray(artifact.transition, dtype=np.float64)
    means = np.asarray(artifact.emission_mean, dtype=np.float64)
    variances = np.asarray(artifact.emission_variance, dtype=np.float64)
    _validate_artifact(initial, transition, means, variances)
    outputs: list[dict[str, Any] | None] = [None] * len(events)
    segment: list[tuple[int, dict[str, Any]]] = []

    def flush() -> None:
        if not segment:
            return
        likelihoods = np.vstack([
            _emission_likelihood(_probability(event), means, variances)
            for _, event in segment
        ])
        alpha = np.zeros_like(likelihoods)
        alpha[0] = _normalize(initial * likelihoods[0])
        for index in range(1, len(segment)):
            alpha[index] = _normalize((alpha[index - 1] @ transition) * likelihoods[index])
        beta = np.ones_like(likelihoods)
        for index in range(len(segment) - 2, -1, -1):
            beta[index] = _normalize(transition @ (likelihoods[index + 1] * beta[index + 1]))
        gamma = np.vstack([_normalize(alpha[index] * beta[index]) for index in range(len(segment))])
        for posterior, (output_index, _) in zip(gamma, segment):
            state = artifact.state_names[int(np.argmax(posterior))]
            outputs[output_index] = _state_output(artifact, posterior, state, None)
        segment.clear()

    previous_observable_timestamp: int | None = None
    for index, event in enumerate(events):
        timestamp = _timestamp(event)
        if not _observable(event):
            flush()
            outputs[index] = _state_output(artifact, initial, NO_OBSERVABLE, "no_observable_reset")
            previous_observable_timestamp = None
            continue
        if (
            previous_observable_timestamp is not None
            and timestamp - previous_observable_timestamp > artifact.config.maximum_gap_ms
        ):
            flush()
        segment.append((index, event))
        previous_observable_timestamp = timestamp
    flush()
    return [output for output in outputs if output is not None]


def _state_output(
    artifact: StateModelArtifact,
    posterior: np.ndarray,
    evidence_state: str,
    reset_reason: str | None,
) -> dict[str, Any]:
    distribution = {
        state: float(posterior[index])
        for index, state in enumerate(artifact.state_names)
    }
    return {
        "model_version": artifact.artifact_version,
        "evidence_state": evidence_state,
        "posterior": distribution,
        "uncertainty": _normalized_entropy(posterior),
        "reset_reason": reset_reason,
        "allow_intervention": False,
        "interpretation": "observable_evidence_not_internal_attention",
    }


def _validate_artifact(
    initial: np.ndarray,
    transition: np.ndarray,
    means: np.ndarray,
    variances: np.ndarray,
) -> None:
    size = len(STATE_NAMES)
    if initial.shape != (size,) or transition.shape != (size, size):
        raise ValueError("invalid_artifact_shape")
    if means.shape != (size,) or variances.shape != (size,):
        raise ValueError("invalid_emission_shape")
    if not np.isclose(initial.sum(), 1) or not np.allclose(transition.sum(axis=1), 1):
        raise ValueError("invalid_probability_rows")
    if np.any(initial < 0) or np.any(transition < 0) or np.any(variances <= 0):
        raise ValueError("invalid_artifact_values")


def _validate_order(events: list[dict[str, Any]]) -> None:
    timestamps = [_timestamp(event) for event in events]
    if any(current <= previous for previous, current in zip(timestamps, timestamps[1:])):
        raise ValueError("event_out_of_order")


def _timestamp(event: dict[str, Any]) -> int:
    value = event.get("timestamp_ms")
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError("invalid_timestamp_ms")
    return value


def _observable(event: dict[str, Any]) -> bool:
    return event.get("observable") is True


def _probability(event: dict[str, Any]) -> float:
    value = event.get("probability")
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 1:
        raise ValueError("observable_event_requires_probability")
    return float(value)


def _emission_likelihood(
    probability: float, means: np.ndarray, variances: np.ndarray
) -> np.ndarray:
    coefficient = 1.0 / np.sqrt(2 * pi * variances)
    exponent = np.exp(-((probability - means) ** 2) / (2 * variances))
    return np.maximum(coefficient * exponent, 1e-300)


def _normalize(values: np.ndarray) -> np.ndarray:
    total = float(values.sum())
    if not np.isfinite(total) or total <= 0:
        raise ValueError("posterior_normalization_failed")
    return values / total


def _normalized_entropy(probabilities: np.ndarray) -> float:
    entropy = -sum(float(value) * log(float(value)) for value in probabilities if value > 0)
    return entropy / log(len(probabilities))
