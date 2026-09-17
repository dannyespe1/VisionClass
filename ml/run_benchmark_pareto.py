"""CLI for PR28 controlled benchmark aggregation and Pareto artifacts."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
from pathlib import Path
from typing import Any

from ml.benchmark_pareto import aggregate_runs, pareto_frontier, recommendations, synthetic_runs


def load_config(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    required = {
        "schema_version", "seed", "repetitions", "duration_seconds", "warmup_seconds",
        "cooldown_seconds", "temperature_target_c", "temperature_tolerance_c",
        "latency_budget_ms_p95", "pareto_load",
    }
    if set(payload) != required:
        raise ValueError("invalid_config_fields")
    if payload["schema_version"] != "device-benchmark-v1" or payload["repetitions"] < 2:
        raise ValueError("invalid_benchmark_config")
    if payload["warmup_seconds"] < 0 or payload["cooldown_seconds"] < 0:
        raise ValueError("invalid_thermal_control")
    return payload


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def _write_svg(path: Path, aggregates: list[dict[str, Any]], frontier_ids: set[str]) -> None:
    points = [row for row in aggregates if row["load"] == "nominal" and row["inference_location"] == "local_device"]
    width, height = 960, 560
    left, right, top, bottom = 90, 30, 50, 80
    x_values = [row["metrics"]["latency_ms_p95"]["mean"] for row in points]
    y_values = [row["metrics"]["balanced_accuracy"]["mean"] for row in points]
    x_min, x_max = min(x_values) * 0.9, max(x_values) * 1.05
    y_min, y_max = min(y_values) - 0.02, max(y_values) + 0.02
    sx = lambda value: left + (value - x_min) / (x_max - x_min) * (width - left - right)
    sy = lambda value: height - bottom - (value - y_min) / (y_max - y_min) * (height - top - bottom)
    colors = {"low": "#2563eb", "balanced": "#16a34a", "high": "#dc2626"}
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="white"/>',
        '<text x="480" y="28" text-anchor="middle" font-family="Arial" font-size="20">PR28 synthetic controlled Pareto view</text>',
        f'<line x1="{left}" y1="{height-bottom}" x2="{width-right}" y2="{height-bottom}" stroke="#111"/>',
        f'<line x1="{left}" y1="{top}" x2="{left}" y2="{height-bottom}" stroke="#111"/>',
        f'<text x="{width/2}" y="{height-24}" text-anchor="middle" font-family="Arial" font-size="14">Latency p95 ms lower is better</text>',
        f'<text x="20" y="{height/2}" transform="rotate(-90 20 {height/2})" text-anchor="middle" font-family="Arial" font-size="14">Balanced accuracy higher is better</text>',
    ]
    for index in range(6):
        x_value = x_min + index * (x_max - x_min) / 5
        x = sx(x_value)
        lines.extend([
            f'<line x1="{x:.1f}" y1="{height-bottom}" x2="{x:.1f}" y2="{height-bottom+6}" stroke="#111"/>',
            f'<text x="{x:.1f}" y="{height-bottom+22}" text-anchor="middle" font-family="Arial" font-size="11">{x_value:.0f}</text>',
        ])
    for index in range(6):
        y_value = y_min + index * (y_max - y_min) / 5
        y = sy(y_value)
        lines.extend([
            f'<line x1="{left-6}" y1="{y:.1f}" x2="{left}" y2="{y:.1f}" stroke="#111"/>',
            f'<text x="{left-10}" y="{y+4:.1f}" text-anchor="end" font-family="Arial" font-size="11">{y_value:.2f}</text>',
        ])
    for row in points:
        x = sx(row["metrics"]["latency_ms_p95"]["mean"])
        y = sy(row["metrics"]["balanced_accuracy"]["mean"])
        frontier = row["scenario_id"] in frontier_ids
        radius = 8 if frontier else 5
        stroke = "#111827" if frontier else "none"
        lines.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius}" fill="{colors[row["profile"]]}" stroke="{stroke}" stroke-width="2"><title>{row["scenario_id"]}</title></circle>')
    lines.extend([
        '<text x="720" y="70" font-family="Arial" font-size="12">Outlined points are non-dominated</text>',
        '<text x="720" y="88" font-family="Arial" font-size="12">Synthetic engineering evidence only</text>',
        '</svg>',
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run(*, config_path: Path, output_dir: Path, code_version: str, synthetic: bool, input_path: Path | None = None) -> dict[str, Any]:
    config = load_config(config_path)
    if synthetic == bool(input_path):
        raise ValueError("choose_exactly_one_of_input_or_synthetic")
    if synthetic:
        rows = synthetic_runs(config)
        input_digest = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
    else:
        input_bytes = input_path.read_bytes()
        payload = json.loads(input_bytes)
        rows = payload.get("runs") or []
        input_digest = hashlib.sha256(input_bytes).hexdigest()
    aggregates = aggregate_runs(rows, config)
    frontier, dominated = pareto_frontier(aggregates, load=config["pareto_load"])
    artifact = {
        "status": "SYNTHETIC_ONLY_NOT_EMPIRICAL" if synthetic else "CONTROLLED_DEVICE_BENCHMARK",
        "provenance": {
            "schema_version": config["schema_version"],
            "data_classification": rows[0]["data_classification"],
            "input_sha256": input_digest,
            "config_sha256": hashlib.sha256(config_path.read_bytes()).hexdigest(),
            "code_version": code_version,
            "runtime": {"python": platform.python_version()},
        },
        "conditions": {
            "matrix": {"device_classes": 3, "profiles": 3, "loads": 3, "locations": 2},
            "repetitions": config["repetitions"],
            "duration_seconds": config["duration_seconds"],
            "warmup_seconds": config["warmup_seconds"],
            "cooldown_seconds": config["cooldown_seconds"],
            "temperature_target_c": config["temperature_target_c"],
            "temperature_tolerance_c": config["temperature_tolerance_c"],
        },
        "aggregates": aggregates,
        "pareto": {
            "load": config["pareto_load"],
            "comparison_scope": "within_device_class",
            "maximize": ["balanced_accuracy", "coverage"],
            "minimize": ["ece", "latency_ms_p95", "memory_mb_peak", "energy_wh_approx", "network_kb"],
            "frontier_scenario_ids": [row["scenario_id"] for row in frontier],
            "dominated_scenario_ids": dominated,
        },
        "recommendations_by_device_class": recommendations(frontier, config),
        "limitations": [
            "synthetic_results_are_not_empirical_device_measurements" if synthetic else "controlled_lab_results_may_not_represent_classrooms",
            "energy_is_approximate",
            "no_claim_about_internal_attention_or_diagnosis",
            "pilot_sample_required_before_generalization",
        ],
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = "SYNTHETIC" if synthetic else "CONTROLLED"
    _write_csv(output_dir / f"{prefix}_BENCHMARK_RUNS.csv", rows)
    (output_dir / f"{prefix}_BENCHMARK_RESULT.json").write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    _write_svg(output_dir / "PARETO_FRONTIER.svg", aggregates, set(artifact["pareto"]["frontier_scenario_ids"]))
    return artifact


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
