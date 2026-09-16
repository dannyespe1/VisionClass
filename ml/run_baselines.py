"""CLI for PR19 baseline artifacts. Input must be approved, pseudonymized JSON."""

from __future__ import annotations

import argparse
import json
import platform
from hashlib import sha256
from pathlib import Path

import numpy as np

from ml.baselines import BaselineConfig, run_baselines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--code-version", required=True)
    args = parser.parse_args()

    input_bytes = args.input.read_bytes()
    config_bytes = args.config.read_bytes()
    payload = json.loads(input_bytes)
    if payload.get("data_classification") not in {"synthetic", "approved_pseudonymized"}:
        raise SystemExit("Input rejected: data_classification must be explicit and approved.")
    config = BaselineConfig(**json.loads(config_bytes))
    result = run_baselines(payload["windows"], config)
    result["provenance"] = {
        "input_sha256": sha256(input_bytes).hexdigest(),
        "config_sha256": sha256(config_bytes).hexdigest(),
        "data_classification": payload["data_classification"],
        "code_version": args.code_version,
        "runtime": {
            "python": platform.python_version(),
            "numpy": np.__version__,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
