import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ml.export_state_model_web import (
    WEB_FORMAT_VERSION,
    canonical_bytes,
    load_reference,
    main as export_cli,
    manifest_payload,
    parity_fixture,
    web_payload,
)


class WebStateModelExportTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[1]
        self.reference_path = self.root / "docs" / "PR20" / "SYNTHETIC_STATE_MODEL.json"

    def test_export_is_deterministic_and_inactive(self):
        artifact = load_reference(self.reference_path)
        first = canonical_bytes(web_payload(artifact))
        second = canonical_bytes(web_payload(artifact))
        self.assertEqual(first, second)
        payload = json.loads(first)
        self.assertEqual(payload["format_version"], WEB_FORMAT_VERSION)
        self.assertFalse(payload["eligibility"]["active"])
        self.assertFalse(payload["eligibility"]["allow_intervention"])
        self.assertFalse(payload["execution"]["raw_media_required"])
        self.assertFalse(payload["execution"]["quantized"])

    def test_manifest_binds_exact_bytes_and_blocks_deployment(self):
        encoded = canonical_bytes(web_payload(load_reference(self.reference_path)))
        manifest = manifest_payload(encoded, "artifact.json")
        self.assertEqual(manifest["sha256"], hashlib.sha256(encoded).hexdigest())
        self.assertEqual(manifest["byte_length"], len(encoded))
        self.assertEqual(manifest["signature_status"], "not_signed_engineering_only")
        self.assertEqual(manifest["deployment_eligibility"], "engineering_parity_only")

    def test_fixture_contains_reference_outputs_and_no_intervention(self):
        artifact = load_reference(self.reference_path)
        source = json.loads((self.root / "docs" / "PR25" / "PARITY_INPUT.json").read_text(encoding="utf-8"))
        fixture = parity_fixture(artifact, source["events"])
        self.assertEqual(len(fixture["events"]), len(fixture["expected"]))
        self.assertTrue(all(not output["allow_intervention"] for output in fixture["expected"]))
        self.assertIn("no_observable", {output["evidence_state"] for output in fixture["expected"]})

    def test_cli_reproduces_versioned_files(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            artifact_output = temporary / "temporal-reference.v1.json"
            manifest_output = temporary / "temporal-reference.v1.manifest.json"
            fixture_output = temporary / "fixture.json"
            arguments = [
                "export_state_model_web.py",
                "--input", str(self.reference_path),
                "--artifact-output", str(artifact_output),
                "--manifest-output", str(manifest_output),
                "--fixture-input", str(self.root / "docs" / "PR25" / "PARITY_INPUT.json"),
                "--fixture-output", str(fixture_output),
            ]
            with patch.object(sys, "argv", arguments):
                export_cli()
            self.assertEqual(
                artifact_output.read_bytes(),
                (self.root / "frontend" / "public" / "models" / "temporal-reference.v1.json").read_bytes(),
            )
            self.assertEqual(
                json.loads(manifest_output.read_text(encoding="utf-8")),
                json.loads((self.root / "frontend" / "public" / "models" / "temporal-reference.v1.manifest.json").read_text(encoding="utf-8")),
            )
            self.assertEqual(
                json.loads(fixture_output.read_text(encoding="utf-8")),
                json.loads((self.root / "docs" / "PR25" / "PARITY_FIXTURES.json").read_text(encoding="utf-8")),
            )


if __name__ == "__main__":
    unittest.main()
