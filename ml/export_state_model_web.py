"""Export the approved PR20 reference HMM to a deterministic Web artifact."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from ml.state_model import EvidenceStateFilter, StateModelArtifact, StateModelConfig


WEB_FORMAT_VERSION = "visionclass-temporal-web-v1"
REFERENCE_ARTIFACT_VERSION = "observable-evidence-hmm-v1"


def load_reference(path: Path) -> StateModelArtifact:
    payload = json.loads(path.read_text(encoding="utf-8"))
    source = payload.get("artifact", payload)
    if source.get("artifact_version") != REFERENCE_ARTIFACT_VERSION:
        raise ValueError("unsupported_reference_artifact")
    if source.get("state_names") != ["off_task_evidence", "task_oriented_evidence"]:
        raise ValueError("unsupported_state_contract")
    config_payload = source.get("config") or {}
    config = StateModelConfig(**config_payload)
    artifact = StateModelArtifact(
        artifact_version=source["artifact_version"],
        state_names=tuple(source["state_names"]),
        initial=tuple(float(value) for value in source["initial"]),
        transition=tuple(tuple(float(value) for value in row) for row in source["transition"]),
        emission_mean=tuple(float(value) for value in source["emission_mean"]),
        emission_variance=tuple(float(value) for value in source["emission_variance"]),
        config=config,
    )
    # Constructor validation happens on first filter creation and fails closed.
    EvidenceStateFilter(artifact)
    return artifact


def web_payload(artifact: StateModelArtifact) -> dict[str, Any]:
    return {
        "format_version": WEB_FORMAT_VERSION,
        "artifact": artifact.as_dict(),
        "execution": {
            "engine": "javascript-cpu",
            "quantized": False,
            "feature_input": "observable_probability_only",
            "raw_media_required": False,
        },
        "eligibility": {
            "classification": "engineering_parity_only",
            "active": False,
            "allow_intervention": False,
            "requires_explicit_engineering_override": True,
        },
    }


def canonical_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def manifest_payload(artifact_bytes: bytes, artifact_filename: str) -> dict[str, Any]:
    return {
        "manifest_version": "local-temporal-manifest-v1",
        "format_version": WEB_FORMAT_VERSION,
        "artifact_version": REFERENCE_ARTIFACT_VERSION,
        "artifact_filename": artifact_filename,
        "sha256": hashlib.sha256(artifact_bytes).hexdigest(),
        "byte_length": len(artifact_bytes),
        "quantized": False,
        "deployment_eligibility": "engineering_parity_only",
        "signature_status": "not_signed_engineering_only",
        "signature": None,
        "feature_flag": "NEXT_PUBLIC_LOCAL_TEMPORAL_MODEL",
    }


def parity_fixture(artifact: StateModelArtifact, events: list[dict[str, Any]]) -> dict[str, Any]:
    engine = EvidenceStateFilter(artifact)
    outputs = [engine.update(event) for event in events]
    return {
        "fixture_version": "local-temporal-parity-v1",
        "numeric_tolerance": 1e-12,
        "events": events,
        "expected": outputs,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--artifact-output", type=Path, required=True)
    parser.add_argument("--manifest-output", type=Path, required=True)
    parser.add_argument("--fixture-input", type=Path)
    parser.add_argument("--fixture-output", type=Path)
    arguments = parser.parse_args()
    if bool(arguments.fixture_input) != bool(arguments.fixture_output):
        parser.error("fixture_input_and_output_must_be_provided_together")

    artifact = load_reference(arguments.input)
    encoded = canonical_bytes(web_payload(artifact))
    arguments.artifact_output.parent.mkdir(parents=True, exist_ok=True)
    arguments.artifact_output.write_bytes(encoded)
    manifest = manifest_payload(encoded, arguments.artifact_output.name)
    arguments.manifest_output.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    if arguments.fixture_input:
        fixture_source = json.loads(arguments.fixture_input.read_text(encoding="utf-8"))
        events = fixture_source.get("events") or []
        fixture = parity_fixture(artifact, events)
        arguments.fixture_output.write_text(
            json.dumps(fixture, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )


if __name__ == "__main__":
    main()
