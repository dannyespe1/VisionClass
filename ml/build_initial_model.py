"""Materialize the first safe VisionClass model artifact from PR24 evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from ml.masked_gru_artifact import write_artifact


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("docs/PR24/SYNTHETIC_GRU_COMPARISON.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/artifacts/masked-gru-observable-evidence-v1-synthetic.json"),
    )
    parser.add_argument(
        "--web-output",
        type=Path,
        default=Path("frontend/public/models/masked-gru-observable-evidence-v1-synthetic.json"),
    )
    parser.add_argument(
        "--web-manifest-output",
        type=Path,
        default=Path("frontend/public/models/masked-gru-observable-evidence-v1-synthetic.manifest.json"),
    )
    arguments = parser.parse_args()
    artifact = write_artifact(arguments.source, arguments.output)
    artifact_bytes = arguments.output.read_bytes()
    arguments.web_output.parent.mkdir(parents=True, exist_ok=True)
    arguments.web_output.write_bytes(artifact_bytes)
    manifest = {
        "manifest_version": "masked-gru-shadow-manifest-v1",
        "artifact_filename": arguments.web_output.name,
        "artifact_version": artifact["artifact_version"],
        "byte_length": len(artifact_bytes),
        "sha256": hashlib.sha256(artifact_bytes).hexdigest(),
        "deployment_eligibility": "shadow_only",
        "signature_status": "not_signed_synthetic_engineering_only",
    }
    arguments.web_manifest_output.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"artifact={arguments.output}")
    print(f"web_artifact={arguments.web_output}")
    print(f"version={artifact['artifact_version']}")
    print(f"weights_sha256={artifact['weights_sha256']}")
    print(f"mode={artifact['lifecycle']['mode']}")


if __name__ == "__main__":
    main()
