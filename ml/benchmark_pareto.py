"""PR28 controlled device benchmark aggregation and Pareto analysis.

This module accepts only coarse device classes and aggregate measurements. It
contains no participant, camera, raw-media, or persistent-device fields.
"""

from __future__ import annotations

import hashlib
import math
import random
from collections import defaultdict
from statistics import mean, stdev
from typing import Any


DEVICE_CLASSES = ("constrained", "standard", "capable")
PROFILES = ("low", "balanced", "high")
LOADS = ("idle", "nominal", "busy")
LOCATIONS = ("local_device", "local_fallback")
UNITS = {
    "temperature_c": "degC",
    "cpu_load_percent": "percent",
    "duration_seconds": "s",
    "latency_ms_p50": "ms",
    "latency_ms_p95": "ms",
    "memory_mb_peak": "MiB",
    "network_kb": "KiB",
    "energy_wh_approx": "Wh",
    "balanced_accuracy": "ratio",
    "ece": "ratio",
    "brier": "ratio",
    "coverage": "ratio",
    "uncertainty_entropy": "ratio",
}
REQUIRED_FIELDS = {
    "scenario_id", "repetition", "seed", "data_classification", "device_class",
    "profile", "load", "inference_location", "temperature_c", "cpu_load_percent",
    "duration_seconds", "balanced_accuracy", "ece", "brier", "coverage",
    "latency_ms_p50", "latency_ms_p95", "memory_mb_peak", "network_kb",
    "energy_wh_approx", "uncertainty_entropy", "raw_media_transmitted",
}


def _scenario_id(device: str, profile: str, load: str, location: str) -> str:
    return f"{device}__{profile}__{load}__{location}"


def _rng(seed: int, scenario: str, repetition: int) -> random.Random:
    digest = hashlib.sha256(f"{seed}:{scenario}:{repetition}".encode()).digest()
    return random.Random(int.from_bytes(digest[:8], "big"))


def synthetic_runs(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Generate deterministic engineering fixtures, never empirical evidence."""
    repetitions = int(config["repetitions"])
    seed = int(config["seed"])
    duration = float(config["duration_seconds"])
    temperature = float(config["temperature_target_c"])
    rows: list[dict[str, Any]] = []
    device_latency = {"constrained": 1.75, "standard": 1.0, "capable": 0.65}
    device_memory = {"constrained": 0.85, "standard": 1.0, "capable": 1.15}
    device_energy = {"constrained": 0.75, "standard": 1.0, "capable": 1.25}
    profile_base = {
        "low": {"latency": 42, "memory": 170, "energy": 0.55, "accuracy": 0.74, "ece": 0.12, "coverage": 0.73},
        "balanced": {"latency": 72, "memory": 285, "energy": 0.95, "accuracy": 0.81, "ece": 0.085, "coverage": 0.86},
        "high": {"latency": 118, "memory": 470, "energy": 1.55, "accuracy": 0.835, "ece": 0.072, "coverage": 0.91},
    }
    load_factor = {"idle": 0.78, "nominal": 1.0, "busy": 1.48}
    load_cpu = {"idle": 24, "nominal": 55, "busy": 88}

    for device in DEVICE_CLASSES:
        for profile in PROFILES:
            for load in LOADS:
                for location in LOCATIONS:
                    scenario = _scenario_id(device, profile, load, location)
                    for repetition in range(1, repetitions + 1):
                        generator = _rng(seed, scenario, repetition)
                        temp = temperature + generator.uniform(-0.7, 0.7)
                        cpu = min(100.0, max(0.0, load_cpu[load] + generator.uniform(-3, 3)))
                        if location == "local_fallback":
                            accuracy = ece = brier = None
                            coverage = 0.0
                            latency_p50 = 4.0 + generator.uniform(-0.3, 0.3)
                            latency_p95 = latency_p50 * 1.25
                            memory = 55.0 * device_memory[device]
                            energy = 0.12 * device_energy[device] * load_factor[load]
                            uncertainty = 1.0
                        else:
                            base = profile_base[profile]
                            pressure = load_factor[load] * device_latency[device]
                            latency_p50 = base["latency"] * pressure * (1 + generator.uniform(-0.035, 0.035))
                            latency_p95 = latency_p50 * (1.22 + generator.uniform(0.02, 0.08))
                            memory = base["memory"] * device_memory[device] * (1 + generator.uniform(-0.025, 0.025))
                            energy = base["energy"] * device_energy[device] * load_factor[load] * (1 + generator.uniform(-0.04, 0.04))
                            degradation = max(0.0, pressure - 1.0)
                            accuracy = max(0.5, min(0.99, base["accuracy"] - 0.025 * degradation + generator.uniform(-0.006, 0.006)))
                            coverage = max(0.0, min(1.0, base["coverage"] - 0.05 * degradation + generator.uniform(-0.008, 0.008)))
                            ece = max(0.0, min(1.0, base["ece"] + 0.018 * degradation + generator.uniform(-0.004, 0.004)))
                            # Deterministic fixture for a resource-pressure case:
                            # the high profile on a constrained class throttles and
                            # should be identified as dominated by the analyzer.
                            if device == "constrained" and profile == "high":
                                accuracy = max(0.5, accuracy - 0.08)
                                coverage = max(0.0, coverage - 0.10)
                                ece = min(1.0, ece + 0.06)
                            brier = max(0.0, min(1.0, 0.24 - 0.16 * (accuracy - 0.5) + 0.25 * ece))
                            uncertainty = max(0.0, min(1.0, 1.0 - coverage + ece))
                        rows.append({
                            "scenario_id": scenario,
                            "repetition": repetition,
                            "seed": seed,
                            "data_classification": "synthetic_controlled_simulation",
                            "device_class": device,
                            "profile": profile,
                            "load": load,
                            "inference_location": location,
                            "temperature_c": round(temp, 3),
                            "cpu_load_percent": round(cpu, 3),
                            "duration_seconds": duration,
                            "balanced_accuracy": None if accuracy is None else round(accuracy, 6),
                            "ece": None if ece is None else round(ece, 6),
                            "brier": None if brier is None else round(brier, 6),
                            "coverage": round(coverage, 6),
                            "latency_ms_p50": round(latency_p50, 3),
                            "latency_ms_p95": round(latency_p95, 3),
                            "memory_mb_peak": round(memory, 3),
                            "network_kb": 0.0,
                            "energy_wh_approx": round(energy, 6),
                            "uncertainty_entropy": round(uncertainty, 6),
                            "raw_media_transmitted": False,
                        })
    return rows


def validate_runs(rows: list[dict[str, Any]], config: dict[str, Any]) -> None:
    if not rows:
        raise ValueError("empty_benchmark")
    expected_repetitions = int(config["repetitions"])
    tolerance = float(config["temperature_tolerance_c"])
    target = float(config["temperature_target_c"])
    groups: dict[str, set[int]] = defaultdict(set)
    classifications: set[str] = set()
    for row in rows:
        if set(row) != REQUIRED_FIELDS:
            raise ValueError("invalid_benchmark_fields")
        if row["data_classification"] not in {"synthetic_controlled_simulation", "controlled_device_benchmark"}:
            raise ValueError("unsupported_data_classification")
        classifications.add(row["data_classification"])
        if row["device_class"] not in DEVICE_CLASSES or row["profile"] not in PROFILES:
            raise ValueError("invalid_device_or_profile")
        if row["load"] not in LOADS or row["inference_location"] not in LOCATIONS:
            raise ValueError("invalid_load_or_location")
        if row["scenario_id"] != _scenario_id(row["device_class"], row["profile"], row["load"], row["inference_location"]):
            raise ValueError("scenario_identity_mismatch")
        if row["raw_media_transmitted"] is not False:
            raise ValueError("raw_media_not_permitted")
        if abs(float(row["temperature_c"]) - target) > tolerance:
            raise ValueError("temperature_out_of_control")
        if not 0 <= float(row["cpu_load_percent"]) <= 100 or float(row["duration_seconds"]) <= 0:
            raise ValueError("invalid_load_or_duration_units")
        if float(row["latency_ms_p50"]) < 0 or float(row["latency_ms_p95"]) < float(row["latency_ms_p50"]):
            raise ValueError("invalid_latency_units")
        for field in ("memory_mb_peak", "network_kb", "energy_wh_approx"):
            if float(row[field]) < 0:
                raise ValueError(f"invalid_{field}_units")
        for field in ("coverage", "uncertainty_entropy"):
            if not 0 <= float(row[field]) <= 1:
                raise ValueError(f"invalid_{field}")
        predictive = (row["balanced_accuracy"], row["ece"], row["brier"])
        if row["inference_location"] == "local_fallback":
            if any(value is not None for value in predictive) or float(row["coverage"]) != 0:
                raise ValueError("fallback_cannot_claim_predictive_performance")
        elif any(value is None or not 0 <= float(value) <= 1 for value in predictive):
            raise ValueError("invalid_predictive_metric")
        repetition = int(row["repetition"])
        if repetition in groups[row["scenario_id"]]:
            raise ValueError("duplicate_scenario_repetition")
        groups[row["scenario_id"]].add(repetition)
    if len(classifications) != 1:
        raise ValueError("mixed_data_classification")
    expected_scenarios = {
        _scenario_id(device, profile, load, location)
        for device in DEVICE_CLASSES
        for profile in PROFILES
        for load in LOADS
        for location in LOCATIONS
    }
    if set(groups) != expected_scenarios:
        raise ValueError("incomplete_benchmark_matrix")
    if any(values != set(range(1, expected_repetitions + 1)) for values in groups.values()):
        raise ValueError("incomplete_repetitions")


def _summary(values: list[float]) -> dict[str, float]:
    center = mean(values)
    deviation = stdev(values) if len(values) > 1 else 0.0
    half_width = 1.96 * deviation / math.sqrt(len(values))
    return {"mean": center, "sd": deviation, "ci95_low": center - half_width, "ci95_high": center + half_width}


def aggregate_runs(rows: list[dict[str, Any]], config: dict[str, Any]) -> list[dict[str, Any]]:
    validate_runs(rows, config)
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        groups[row["scenario_id"]].append(row)
    metrics = tuple(UNITS)
    aggregates = []
    for scenario in sorted(groups):
        group = groups[scenario]
        first = group[0]
        result = {key: first[key] for key in ("scenario_id", "data_classification", "device_class", "profile", "load", "inference_location")}
        result["repetitions"] = len(group)
        result["metrics"] = {}
        for metric in metrics:
            values = [float(row[metric]) for row in group if row[metric] is not None]
            result["metrics"][metric] = None if not values else {**_summary(values), "unit": UNITS[metric]}
        result["conditions"] = {
            "temperature_c_min": min(row["temperature_c"] for row in group),
            "temperature_c_max": max(row["temperature_c"] for row in group),
            "cpu_load_percent_min": min(row["cpu_load_percent"] for row in group),
            "cpu_load_percent_max": max(row["cpu_load_percent"] for row in group),
        }
        aggregates.append(result)
    return aggregates


def pareto_frontier(aggregates: list[dict[str, Any]], *, load: str = "nominal") -> tuple[list[dict[str, Any]], list[str]]:
    eligible = [row for row in aggregates if row["load"] == load and row["inference_location"] == "local_device"]
    maximize = ("balanced_accuracy", "coverage")
    minimize = ("ece", "latency_ms_p95", "memory_mb_peak", "energy_wh_approx", "network_kb")

    def dominates(left: dict[str, Any], right: dict[str, Any]) -> bool:
        left_metrics, right_metrics = left["metrics"], right["metrics"]
        no_worse = all(left_metrics[name]["mean"] >= right_metrics[name]["mean"] for name in maximize)
        no_worse &= all(left_metrics[name]["mean"] <= right_metrics[name]["mean"] for name in minimize)
        strictly = any(left_metrics[name]["mean"] > right_metrics[name]["mean"] for name in maximize)
        strictly |= any(left_metrics[name]["mean"] < right_metrics[name]["mean"] for name in minimize)
        return no_worse and strictly

    # Device classes represent different deployment envelopes and are not
    # interchangeable.  Dominance is therefore evaluated within each class.
    dominated = {
        candidate["scenario_id"]
        for candidate in eligible
        if any(
            dominates(other, candidate)
            for other in eligible
            if other is not candidate and other["device_class"] == candidate["device_class"]
        )
    }
    frontier = [row for row in eligible if row["scenario_id"] not in dominated]
    return frontier, sorted(dominated)


def recommendations(frontier: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    latency_budget = float(config["latency_budget_ms_p95"])
    result = {}
    for device in DEVICE_CLASSES:
        candidates = [row for row in frontier if row["device_class"] == device]
        within = [row for row in candidates if row["metrics"]["latency_ms_p95"]["mean"] <= latency_budget]
        pool = within or candidates
        if not pool:
            result[device] = {"status": "INSUFFICIENT_EVIDENCE", "scenario_id": None}
            continue
        selected = max(pool, key=lambda row: (
            row["metrics"]["balanced_accuracy"]["mean"] + row["metrics"]["coverage"]["mean"]
            - row["metrics"]["ece"]["mean"] - row["metrics"]["energy_wh_approx"]["mean"] / 10
        ))
        result[device] = {
            "status": "SYNTHETIC_CONTROLLED_RECOMMENDATION",
            "scenario_id": selected["scenario_id"],
            "profile": selected["profile"],
            "within_latency_budget": selected["metrics"]["latency_ms_p95"]["mean"] <= latency_budget,
            "requires_empirical_confirmation": True,
        }
    return result
