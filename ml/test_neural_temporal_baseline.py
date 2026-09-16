import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import torch

from ml.baselines import BaselineConfig, assign_participant_splits, partition_windows, assert_no_participant_leakage
from ml.neural_temporal_baseline import (
    GRUBaselineConfig,
    MaskedGRUClassifier,
    _sequences,
    run_neural_temporal_baseline,
    train_masked_gru,
)
from ml.run_neural_temporal_baseline import main as run_cli, synthetic_records


def fast_config(**changes):
    values = {
        "epochs": 20,
        "bootstrap_iterations": 10,
        "hidden_size": 6,
        "training_seeds": (24017, 24023),
    }
    values.update(changes)
    return GRUBaselineConfig(**values)


class MaskedGRUTests(unittest.TestCase):
    def test_masked_step_breaks_segment_state(self):
        torch.manual_seed(7)
        model = MaskedGRUClassifier(3, 4)
        features = torch.tensor([
            [0.2, 0.4, 0.6], [9.0, 9.0, 9.0], [0.7, 0.3, 0.1]
        ], dtype=torch.float32)
        logits = model(features, torch.tensor([True, False, True]))
        fresh = model(features[2:], torch.tensor([True]))
        self.assertAlmostEqual(float(logits[2]), float(fresh[0]), places=7)

    def test_explicit_reset_breaks_sequence_state(self):
        torch.manual_seed(11)
        model = MaskedGRUClassifier(3, 4)
        features = torch.tensor([[0.2, 0.4, 0.6], [0.7, 0.3, 0.1]], dtype=torch.float32)
        logits = model(features, torch.tensor([True, True]), torch.tensor([True, True]))
        fresh = model(features[1:], torch.tensor([True]), torch.tensor([True]))
        self.assertAlmostEqual(float(logits[1]), float(fresh[0]), places=7)

    def test_participant_split_is_exclusive_before_sequences(self):
        records = synthetic_records()
        assignment = assign_participant_splits(
            (row["participant_id"] for row in records), BaselineConfig()
        )
        partitions = partition_windows(records, assignment)
        assert_no_participant_leakage(partitions)
        for participant in {row["participant_id"] for row in records}:
            self.assertEqual(
                sum(participant in {row["participant_id"] for row in rows} for rows in partitions.values()),
                1,
            )

    def test_deliberate_overfit_probe_reduces_training_loss(self):
        records = synthetic_records(8)
        assignment = assign_participant_splits(
            (row["participant_id"] for row in records),
            BaselineConfig(validation_fraction=0.25, test_fraction=0.25),
        )
        partitions = partition_windows(records, assignment)
        config = fast_config(epochs=80, validation_fraction=0.25, test_fraction=0.25, l2_penalty=0.0)
        _, curve = train_masked_gru(
            _sequences(partitions["train"]), _sequences(partitions["validation"]), config, 24017
        )
        self.assertLess(curve[-1]["train_loss"], curve[0]["train_loss"] * 0.35)

    def test_repeated_training_is_byte_equivalent(self):
        config = fast_config()
        first = run_neural_temporal_baseline(synthetic_records(), config)
        second = run_neural_temporal_baseline(list(reversed(synthetic_records())), config)
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))

    def test_compares_pr19_pr20_and_two_gru_runs(self):
        result = run_neural_temporal_baseline(synthetic_records(), fast_config())
        comparisons = result["comparisons"]
        self.assertIn("pr19_window_logistic", comparisons)
        self.assertIn("pr20_observable_evidence_hmm", comparisons)
        self.assertEqual([run["seed"] for run in comparisons["masked_gru_runs"]], [24017, 24023])
        self.assertIn("ece", comparisons["variability"])
        self.assertLess(comparisons["masked_gru_runs"][0]["test"]["metrics"]["coverage"], 1.0)

    def test_candidate_is_shadow_only_and_contains_cost_and_curves(self):
        result = run_neural_temporal_baseline(synthetic_records(), fast_config())
        candidate = result["candidate"]
        self.assertEqual(candidate["mode"], "shadow_only")
        self.assertFalse(candidate["active"])
        self.assertFalse(candidate["allow_intervention"])
        self.assertFalse(candidate["raw_media_required"])
        self.assertEqual(candidate["promotion_status"], "SHADOW_ONLY_REQUIRES_REAL_APPROVED_EVALUATION")
        for run in result["comparisons"]["masked_gru_runs"]:
            self.assertEqual(len(run["training_curve"]), 20)
            self.assertGreater(run["cost"]["parameter_count"], 0)

    def test_no_observable_label_fails_closed(self):
        records = synthetic_records()
        row = next(row for row in records if not row["quality"]["observable"])
        row["label"] = 0
        with self.assertRaisesRegex(ValueError, "no_observable_label_must_be_null"):
            run_neural_temporal_baseline(records, fast_config())


class MaskedGRUCliTests(unittest.TestCase):
    def test_cli_records_provenance_without_activating_candidate(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            config_path = temporary / "config.json"
            config_path.write_text(json.dumps({
                **fast_config().__dict__, "training_seeds": [24017, 24023]
            }), encoding="utf-8")
            output = temporary / "output.json"
            arguments = [
                "run_neural_temporal_baseline.py", "--synthetic",
                "--config", str(config_path), "--output", str(output),
                "--code-version", "pr24-test",
            ]
            with patch.object(sys, "argv", arguments):
                run_cli()
            artifact = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(artifact["provenance"]["data_classification"], "synthetic")
            self.assertEqual(artifact["provenance"]["code_version"], "pr24-test")
            self.assertFalse(artifact["result"]["candidate"]["active"])
            self.assertEqual(len(artifact["provenance"]["input_sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
