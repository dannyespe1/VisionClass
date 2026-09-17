import json
import tempfile
import unittest
from pathlib import Path

from ml.run_validity_agreement import load_config, run, synthetic_records
from ml.validity_agreement import agreement_analysis, analyze, validate_records


class ValidityAgreementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).resolve().parents[1]
        cls.config_path = cls.root / "ml" / "config" / "pr32_validity_agreement_v1.json"
        cls.config = load_config(cls.config_path)
        cls.records = synthetic_records(cls.config)
        cls.analysis = analyze(cls.records, cls.config)

    def test_synthetic_matrix_is_complete_deterministic_and_participant_sized(self):
        self.assertEqual(self.records, synthetic_records(self.config))
        counts = validate_records(self.records, self.config)
        self.assertEqual(counts, {"participants": 80, "sessions": 80, "records": 1120})
        self.assertEqual(len({(row["participant_pseudo"], row["phase_index"]) for row in self.records}), 1120)

    def test_incomplete_or_insufficient_samples_fail_closed(self):
        incomplete = [dict(row) for row in self.records if not (row["participant_pseudo"] == "syn-p001" and row["phase_index"] == 14)]
        with self.assertRaisesRegex(ValueError, "incomplete_session_phases"):
            validate_records(incomplete, self.config)
        insufficient = [dict(row) for row in self.records if row["participant_pseudo"] != "syn-p001"]
        with self.assertRaisesRegex(ValueError, "insufficient_participant_sample"):
            validate_records(insufficient, self.config)

    def test_no_observable_and_nonresponse_are_not_imputed(self):
        broken = [dict(row) for row in self.records]
        target = next(row for row in broken if not row["observable"])
        target["inference_probability"] = 0.0
        with self.assertRaisesRegex(ValueError, "no_observable_requires_reason_and_null_probability"):
            validate_records(broken, self.config)
        broken = [dict(row) for row in self.records]
        target = next(row for row in broken if row["self_report_prompted"])
        target["self_report"] = None
        with self.assertRaisesRegex(ValueError, "prompted_self_report_requires_explicit_response"):
            validate_records(broken, self.config)

    def test_identity_is_opaque_and_temporal_order_is_monotonic(self):
        broken = [dict(row) for row in self.records]
        broken[0]["participant_pseudo"] = "student@example.com"
        with self.assertRaisesRegex(ValueError, "invalid_pseudonymous_identity"):
            validate_records(broken, self.config)
        broken = [dict(row) for row in self.records]
        target = next(row for row in broken if row["participant_pseudo"] == "syn-p001" and row["phase_index"] == 2)
        target["timestamp_ms"] = next(row["timestamp_ms"] for row in broken if row["participant_pseudo"] == "syn-p001" and row["phase_index"] == 1)
        with self.assertRaisesRegex(ValueError, "non_monotonic_session_timestamps"):
            validate_records(broken, self.config)

    def test_agreement_has_prevalence_and_participant_cluster_interval(self):
        agreement = self.analysis["agreement"]
        self.assertEqual(agreement["method"], "cohen_kappa_with_participant_cluster_bootstrap")
        self.assertEqual(agreement["all_categories"]["pairs"], 1120)
        self.assertEqual(agreement["all_categories"]["ci95"]["cluster"], "participant")
        self.assertGreater(agreement["all_categories"]["ci95"]["iterations_valid"], 0)
        observer_a_total = sum(item["count"] for item in agreement["prevalence"]["observer_a"].values())
        self.assertEqual(observer_a_total, 1120)

    def test_independent_known_sample_reproduces_perfect_kappa(self):
        records = [dict(row) for row in self.records]
        for row in records:
            row["observer_b"] = row["observer_a"]
        result = agreement_analysis(records, {**self.config, "bootstrap_iterations": 100})
        self.assertAlmostEqual(result["all_categories"]["value"], 1.0)
        self.assertAlmostEqual(result["all_categories"]["observed_agreement"], 1.0)

    def test_convergence_reports_temporal_pairs_calibration_and_denominators(self):
        convergence = self.analysis["convergent_validity"]
        for anchor in ("self_report", "observer_consensus", "interaction_count", "micro_assessment"):
            self.assertEqual(set(convergence[anchor]["lags_in_phases"]), {"-1", "0", "1"})
            concurrent = convergence[anchor]["lags_in_phases"]["0"]
            self.assertGreater(concurrent["pairs"], 0)
            self.assertLessEqual(concurrent["participants"], 80)
        calibration = convergence["self_report"]["lags_in_phases"]["0"]["classification_and_calibration"]
        self.assertEqual(calibration["threshold_provenance"], "frozen_configuration_not_selected_on_analysis_data")
        self.assertIsNotNone(calibration["sensitivity"])
        self.assertIsNotNone(calibration["ece"])

    def test_report_separates_constructs_discrepancies_and_ui_limits(self):
        self.assertEqual(self.analysis["analysis_unit"], "participant_with_repeated_phases")
        self.assertIn("omitted", self.analysis["missingness_and_discrepancies"]["self_report"])
        self.assertGreater(self.analysis["missingness_and_discrepancies"]["no_observable"]["count"], 0)
        disclosures = " ".join(self.analysis["required_ui_disclosure"])
        self.assertIn("do not prove causality", disclosures)
        self.assertIn("distinct constructs", disclosures)

    def test_cli_is_reproducible_and_synthetic_cannot_be_confirmatory(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            first = run(config_path=self.config_path, output_dir=output, code_version="pr32-test", synthetic=True)
            first_bytes = (output / "SYNTHETIC_VALIDITY_REPORT.json").read_bytes()
            second = run(config_path=self.config_path, output_dir=output, code_version="pr32-test", synthetic=True)
            self.assertEqual(first, second)
            self.assertEqual(first_bytes, (output / "SYNTHETIC_VALIDITY_REPORT.json").read_bytes())
            self.assertEqual(first["status"], "SYNTHETIC_ONLY_NOT_CONFIRMATORY")
            self.assertFalse(first["provenance"]["sample_sufficiency"]["approved"])

    def test_real_input_requires_sample_evidence_and_uses_distinct_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "input.json"
            payload = {
                "data_classification": "real_approved_confirmatory",
                "sample_sufficiency": {"approved": False, "reference": None},
                "records": self.records,
            }
            input_path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing_sample_sufficiency_evidence"):
                run(config_path=self.config_path, output_dir=root / "out", code_version="test", synthetic=False, input_path=input_path)
            payload["sample_sufficiency"] = {"approved": True, "reference": "synthetic-test-reference"}
            input_path.write_text(json.dumps(payload), encoding="utf-8")
            report = run(config_path=self.config_path, output_dir=root / "out", code_version="test", synthetic=False, input_path=input_path)
            self.assertEqual(report["status"], "ANALYSIS_COMPLETE_REQUIRES_INDEPENDENT_REVIEW")
            self.assertTrue((root / "out" / "CONFIRMATORY_VALIDITY_RECORDS.csv").exists())
            self.assertTrue((root / "out" / "CONFIRMATORY_VALIDITY_REPORT.json").exists())


if __name__ == "__main__":
    unittest.main()
