import json
import tempfile
import unittest
from pathlib import Path

from ml.fairness_audit import audit, validate_records
from ml.run_fairness_audit import load_config, run, synthetic_records


class FairnessAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).resolve().parents[1]
        cls.config_path = cls.root / "ml" / "config" / "pr34_fairness_audit_v1.json"
        cls.config = load_config(cls.config_path)
        cls.records = synthetic_records(cls.config)
        cls.audit = audit(cls.records, cls.config)

    def test_fixture_is_complete_deterministic_and_participant_sized(self):
        self.assertEqual(self.records, synthetic_records(self.config))
        self.assertEqual(validate_records(self.records, self.config), {"participants": 96, "records": 960})
        self.assertEqual(len({row["window_id"] for row in self.records}), 960)

    def test_invalid_identifiers_and_no_observable_values_fail_closed(self):
        broken = [dict(row) for row in self.records]
        broken[0]["participant_pseudo"] = "person@example.com"
        with self.assertRaisesRegex(ValueError, "invalid_pseudonymous_participant"):
            validate_records(broken, self.config)
        broken = [dict(row) for row in self.records]
        target = next(row for row in broken if not row["observable"])
        target["probability"] = 0.0
        with self.assertRaisesRegex(ValueError, "no_observable_requires_null_outcomes_and_reason"):
            validate_records(broken, self.config)

    def test_total_sample_limits_fail_closed(self):
        insufficient = [row for row in self.records if int(row["participant_pseudo"][-3:]) <= 79]
        with self.assertRaisesRegex(ValueError, "insufficient_total_participants"):
            validate_records(insufficient, self.config)

    def test_invalid_gate_limits_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            invalid = {**self.config, "maximum_coverage_gap": -0.1}
            path.write_text(json.dumps(invalid), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalid_deployment_gate_limits"):
                load_config(path)

    def test_small_cells_are_suppressed_without_identity_or_denominator(self):
        suppression = self.audit["suppression"]
        self.assertTrue(suppression["has_suppressed_cells"])
        self.assertFalse(suppression["cell_count_released"])
        self.assertFalse(suppression["identities_and_denominators_released"])
        serialized = json.dumps(self.audit, sort_keys=True)
        self.assertNotIn("b3_small", serialized)
        released_scopes = {cell["scope"] for cell in self.audit["released_cells"]}
        self.assertNotIn("group_b", released_scopes)
        self.assertNotIn("intersection", released_scopes)
        self.assertEqual(suppression["policy"], "suppress_entire_scope_when_any_component_cell_is_ineligible")

    def test_released_cells_include_denominators_metrics_and_intervals(self):
        cells = self.audit["released_cells"]
        overall = next(cell for cell in cells if cell["scope"] == "overall")
        self.assertEqual(overall["metrics"]["participants"], 96)
        self.assertEqual(overall["metrics"]["records"], 960)
        self.assertIn("false_positive_rate", overall["metrics"])
        self.assertIn("false_negative_rate", overall["metrics"])
        self.assertIn("macro_f1", overall["metrics"])
        self.assertIn("ece", overall["metrics"])
        self.assertIn("coverage", overall["metrics"])
        self.assertEqual(overall["ci95"]["coverage"]["cluster"], "participant")
        self.assertGreater(overall["ci95"]["coverage"]["iterations_valid"], 0)

    def test_disparity_or_insufficiency_blocks_promotion(self):
        gate = self.audit["deployment_gate"]
        self.assertEqual(gate["status"], "BLOCK_PROMOTION")
        self.assertFalse(gate["automatic_promotion_permitted"])
        self.assertIn("INSUFFICIENT_GROUP_OR_INTERSECTION_EVIDENCE", gate["violations"])
        self.assertTrue(any(item.startswith("GAP_EXCEEDS_LIMIT") for item in gate["violations"]))

    def test_threshold_sensitivity_is_exploratory_only(self):
        sensitivity = self.audit["threshold_sensitivity"]
        self.assertFalse(sensitivity["application_permitted"])
        self.assertTrue(sensitivity["common_threshold_table"])
        self.assertTrue(sensitivity["group_specific_exploratory"])
        self.assertEqual(
            {row["threshold"] for row in sensitivity["common_threshold_table"][0]["values"]},
            {0.3, 0.4, 0.5, 0.6, 0.7},
        )

    def test_synthetic_cli_is_reproducible_and_never_passes_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            first = run(config_path=self.config_path, output_dir=output, code_version="pr34-test", synthetic=True)
            first_bytes = (output / "SYNTHETIC_FAIRNESS_REPORT.json").read_bytes()
            second = run(config_path=self.config_path, output_dir=output, code_version="pr34-test", synthetic=True)
            self.assertEqual(first, second)
            self.assertEqual(first_bytes, (output / "SYNTHETIC_FAIRNESS_REPORT.json").read_bytes())
            self.assertEqual(first["status"], "SYNTHETIC_ONLY_NOT_FAIRNESS_EVIDENCE")
            self.assertEqual(first["deployment_gate"]["status"], "BLOCK_PROMOTION_SYNTHETIC_ONLY")

    def test_real_mode_requires_both_approvals_and_does_not_copy_protected_records(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "protected.json"
            payload = {
                "data_classification": "real_approved_fairness_audit",
                "approvals": {
                    "group_sufficiency": {"approved": True, "reference": "sample-review"},
                    "vault_release": {"approved": False, "reference": None},
                },
                "records": self.records,
            }
            input_path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing_vault_release_approval"):
                run(config_path=self.config_path, output_dir=root / "out", code_version="test", synthetic=False, input_path=input_path)
            payload["approvals"]["vault_release"] = {"approved": True, "reference": "privacy-review"}
            input_path.write_text(json.dumps(payload), encoding="utf-8")
            report = run(config_path=self.config_path, output_dir=root / "out", code_version="test", synthetic=False, input_path=input_path)
            self.assertEqual(report["status"], "AUDIT_COMPLETE_REQUIRES_INDEPENDENT_REVIEW")
            self.assertTrue((root / "out" / "PROTECTED_FAIRNESS_REPORT.json").exists())
            self.assertFalse((root / "out" / "PROTECTED_FAIRNESS_RECORDS.csv").exists())


if __name__ == "__main__":
    unittest.main()
