"""Synthetic latency check for PR21; no participant data is read."""

import argparse
import json
from pathlib import Path
from time import perf_counter
from uuid import uuid5, NAMESPACE_URL

import numpy as np

from ml.temporal_api import TemporalInferenceEngine, TemporalInferenceRequest, load_state_artifact


def run(sessions: int, windows_per_session: int) -> dict:
    artifact_path = Path(__file__).resolve().parents[1] / "docs" / "PR20" / "SYNTHETIC_STATE_MODEL.json"
    engine = TemporalInferenceEngine(load_state_artifact(artifact_path))
    latencies = []
    for session in range(sessions):
        for window in range(windows_per_session):
            payload = TemporalInferenceRequest(
                contract_version="1.0",
                inference_id=uuid5(NAMESPACE_URL, f"synthetic:{session}:{window}"),
                window_id=session * windows_per_session + window + 1,
                model_id=engine.artifact.artifact_version,
                events=[
                    {
                        "timestamp_ms": index * 5000,
                        "observable": True,
                        "probability": 0.2 if index < 4 else 0.8,
                    }
                    for index in range(8)
                ],
            )
            started = perf_counter()
            engine.infer(payload)
            latencies.append((perf_counter() - started) * 1000)
    return {
        "data_classification": "synthetic",
        "sessions": sessions,
        "windows": len(latencies),
        "latency_ms": {
            "p50": float(np.percentile(latencies, 50)),
            "p95": float(np.percentile(latencies, 95)),
            "p99": float(np.percentile(latencies, 99)),
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sessions", type=int, default=100)
    parser.add_argument("--windows-per-session", type=int, default=10)
    args = parser.parse_args()
    if not 1 <= args.sessions <= 1000 or not 1 <= args.windows_per_session <= 1000:
        raise SystemExit("benchmark bounds exceeded")
    print(json.dumps(run(args.sessions, args.windows_per_session), sort_keys=True))
