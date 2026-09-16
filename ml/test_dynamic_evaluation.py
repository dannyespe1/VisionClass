import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ml.dynamic_evaluation import DynamicEvaluationConfig, evaluate_dynamic_model
from ml.run_dynamic_evaluation import load_config, main as run_cli, synthetic_records


class DynamicEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.config = DynamicEvaluationConfig(bootstrap_iterations=20)

    def test_rejects_participant_leakage(self):
        records = synthetic_records()
        records[-1]["participant_id"] = records[0]["participant_id"]
        with self.assertRaisesRegex(ValueError, "participant_leakage"):
            evaluate_dynamic_model(records, self.config, data_classification="synthetic")

    def test_no_observable_is_excluded_but_reduces_coverage(self):
        result = evaluate_dynamic_model(synthetic_records(), self.config, data_classification="synthetic")
        metrics = result["classification"]["dynamic_model"]
        self.assertLess(metrics["eligible_windows"], metrics["total_windows"])
        self.assertLess(metrics["coverage"], 1)
        reasons = result["dynamics"]["noise_and_segment_breaks"]["no_observable_by_reason"]
        self.assertGreater(sum(reasons.values()), 0)

    def test_reports_all_frozen_estimands_and_two_seed_repetitions(self):
        result = evaluate_dynamic_model(synthetic_records(), self.config, data_classification="synthetic")
        dynamics = result["dynamics"]
        for name in (
            "volatility_mean_absolute_adjacent_change", "transition_counts", "persistence",
            "episode_dwell_ms", "recovery_delay_ms", "change_detection_delay_ms",
            "normalized_predictive_entropy", "coverage", "noise_and_segment_breaks",
        ):
            self.assertIn(name, dynamics)
        self.assertEqual(set(result["classification"]["bootstrap_ci95_by_seed"]), {"23017", "23023"})
        self.assertEqual(len(result["participant_error"]), 4)
        self.assertTrue(all("participant_id" not in row for row in result["participant_error"]))
        noise = dynamics["noise_and_segment_breaks"]
        for name in ("eligible_pairs", "included_pairs", "quality_or_illumination_breaks", "gap_or_suspension_breaks", "no_observable_by_reason", "edge_profile_breaks"):
            self.assertIn(name, noise)

    def test_synthetic_evidence_cannot_pass_confirmatory_gate(self):
        result = evaluate_dynamic_model(synthetic_records(), self.config, data_classification="synthetic")
        self.assertEqual(result["confirmatory_gate"]["status"], "NOT_EVALUABLE_SYNTHETIC")
        self.assertFalse(result["confirmatory_gate"]["criteria"]["target_sample_reached"])
        self.assertEqual(result["construct_validity"]["status"], "NOT_ESTABLISHED_BY_CLASSIFICATION_OR_TEMPORAL_METRICS")

    def test_repeated_run_is_deterministic(self):
        first = evaluate_dynamic_model(synthetic_records(), self.config, data_classification="synthetic")
        second = evaluate_dynamic_model(list(reversed(synthetic_records())), self.config, data_classification="synthetic")
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))

    def test_no_observable_probability_fails_closed(self):
        records = synthetic_records()
        row = next(item for item in records if not item["quality"]["observable"])
        row["dynamic_probability"] = 0.2
        with self.assertRaisesRegex(ValueError, "no_observable_probability_must_be_null"):
            evaluate_dynamic_model(records, self.config, data_classification="synthetic")

    def test_gap_and_profile_changes_break_segments(self):
        records = synthetic_records()
        participant = next(row["participant_id"] for row in records if row["split"] == "test")
        participant_rows = [row for row in records if row["participant_id"] == participant]
        participant_rows[6]["edge_profile_generation"] = 2
        participant_rows[-1]["timestamp_ms"] += 10000
        result = evaluate_dynamic_model(records, self.config, data_classification="synthetic")
        noise = result["dynamics"]["noise_and_segment_breaks"]
        self.assertGreater(noise["edge_profile_breaks"], 0)
        self.assertGreater(noise["gap_or_suspension_breaks"], 0)
        self.assertLess(noise["included_pairs"], noise["eligible_pairs"])

    def test_real_run_rejects_synthetic_threshold_provenance(self):
        with self.assertRaisesRegex(ValueError, "frozen_development_threshold_provenance"):
            evaluate_dynamic_model(
                synthetic_records(), self.config, data_classification="real_approved_confirmatory"
            )


class DynamicEvaluationCliTests(unittest.TestCase):
    def test_config_contains_ratified_values(self):
        root = Path(__file__).resolve().parents[1]
        config = load_config(root / "ml" / "config" / "pr23_dynamic_evaluation_v1.json")
        self.assertEqual(config.target_participants, 80)
        self.assertEqual(config.maximum_participants, 100)
        self.assertEqual(config.sesoi, 0.10)
        self.assertEqual(config.minimum_auroc_lower_ci, 0.75)
        self.assertEqual(config.minimum_sensitivity, 0.70)
        self.assertEqual(config.minimum_specificity, 0.80)
        self.assertEqual(config.minimum_absolute_auprc_gain, 0.15)

    def test_cli_generates_versioned_synthetic_artifact(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "result.json"
            arguments = [
                "run_dynamic_evaluation.py", "--synthetic",
                "--config", str(root / "ml" / "config" / "pr23_dynamic_evaluation_v1.json"),
                "--output", str(output), "--code-version", "pr23-test",
            ]
            with patch.object(sys, "argv", arguments):
                run_cli()
            artifact = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(artifact["result"]["data_classification"], "synthetic")
            self.assertEqual(artifact["provenance"]["code_version"], "pr23-test")
            self.assertEqual(len(artifact["provenance"]["config_sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
