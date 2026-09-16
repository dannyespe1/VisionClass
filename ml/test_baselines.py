import json
import sys
import tempfile
import unittest
from dataclasses import asdict
from pathlib import Path
from unittest.mock import patch

from ml.baselines import (
    BaselineConfig,
    assert_no_participant_leakage,
    assign_participant_splits,
    partition_windows,
    run_baselines,
)
from ml.run_baselines import main as run_cli


def synthetic_windows(participants=15):
    records = []
    for participant_index in range(participants):
        participant = f"syn-p{participant_index:02d}"
        for window_index, label in enumerate((0, 1, 1)):
            observable = window_index != 2 or participant_index % 4 != 0
            centered = label == 1
            records.append({
                "participant_id": participant,
                "window_id": f"{participant}-w{window_index}",
                "label": label if observable else None,
                "features": {
                    "face_center_x": 0.52 if centered else 0.9,
                    "face_center_y": 0.45 if centered else 0.82,
                    "face_width": 0.35,
                    "face_height": 0.5,
                    "eye_span": 0.2,
                    "head_roll": 0.08 if centered else 0.55,
                    "gaze_horizontal_proxy": 0.51 if centered else 0.88,
                    "pose_available": 1,
                    "gaze_available": 1,
                },
                "quality": {
                    "observable": observable,
                    "confidence": 0.9 if observable else None,
                    "reason": None if observable else "low_confidence",
                },
            })
    return records


class ParticipantSplitTests(unittest.TestCase):
    def test_split_is_exact_and_has_no_participant_leakage(self):
        records = synthetic_windows()
        config = BaselineConfig(bootstrap_iterations=10)
        first = assign_participant_splits((row["participant_id"] for row in records), config)
        second = assign_participant_splits((row["participant_id"] for row in reversed(records)), config)
        self.assertEqual(first, second)
        partitions = partition_windows(records, first)
        assert_no_participant_leakage(partitions)
        participant_sets = [set(row["participant_id"] for row in partitions[name]) for name in partitions]
        self.assertFalse(participant_sets[0] & participant_sets[1])
        self.assertFalse(participant_sets[0] & participant_sets[2])
        self.assertFalse(participant_sets[1] & participant_sets[2])

    def test_explicit_leakage_is_rejected(self):
        record = synthetic_windows(5)[0]
        with self.assertRaisesRegex(ValueError, "participant_leakage"):
            assert_no_participant_leakage({"train": [record], "validation": [], "test": [record]})


class BaselineRunTests(unittest.TestCase):
    def test_repeated_run_is_byte_equivalent(self):
        config = BaselineConfig(bootstrap_iterations=20)
        first = run_baselines(synthetic_windows(), config)
        second = run_baselines(list(reversed(synthetic_windows())), config)
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))

    def test_reports_metrics_intervals_confusion_and_coverage(self):
        result = run_baselines(synthetic_windows(), BaselineConfig(bootstrap_iterations=20))
        self.assertEqual(result["feature_contract"], "normalized-features-v1")
        self.assertEqual(result["interpretation"], "observable_task_orientation_not_internal_attention")
        for baseline_name in ("window_classifier", "heuristic_rule"):
            baseline = result[baseline_name]
            for metric in ("macro_f1", "balanced_accuracy", "brier_score", "ece", "coverage"):
                self.assertIn(metric, baseline["metrics"])
                self.assertIn(metric, baseline["ci95_participant_bootstrap"])
            self.assertEqual(set(baseline["metrics"]["confusion_matrix"]), {"tn", "fp", "fn", "tp"})
            self.assertLess(baseline["metrics"]["coverage"], 1.0)

    def test_config_serializes_without_hidden_state(self):
        config = BaselineConfig()
        self.assertEqual(BaselineConfig(**asdict(config)), config)

    def test_invalid_cost_and_split_configuration_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "split_fractions"):
            run_baselines(synthetic_windows(), BaselineConfig(validation_fraction=0.7, test_fraction=0.4))
        with self.assertRaisesRegex(ValueError, "bootstrap_iterations"):
            run_baselines(synthetic_windows(), BaselineConfig(bootstrap_iterations=0))

    def test_versioned_synthetic_artifact_matches(self):
        artifact_path = Path(__file__).resolve().parents[1] / "docs" / "PR19" / "SYNTHETIC_BASELINE_RESULT.json"
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        self.assertEqual(artifact["data_classification"], "synthetic")
        self.assertEqual(artifact["result"], run_baselines(synthetic_windows(), BaselineConfig()))


class BaselineCliTests(unittest.TestCase):
    def test_cli_records_provenance_for_synthetic_input(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            input_path = temporary / "input.json"
            output_path = temporary / "output.json"
            input_path.write_text(json.dumps({
                "data_classification": "synthetic",
                "windows": synthetic_windows(),
            }), encoding="utf-8")
            arguments = [
                "run_baselines.py",
                "--input", str(input_path),
                "--config", str(root / "ml" / "config" / "pr19_baselines_v1.json"),
                "--output", str(output_path),
                "--code-version", "pr19-test",
            ]
            with patch.object(sys, "argv", arguments):
                run_cli()
            output = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(output["provenance"]["data_classification"], "synthetic")
            self.assertEqual(output["provenance"]["code_version"], "pr19-test")
            self.assertIn("python", output["provenance"]["runtime"])
            self.assertIn("numpy", output["provenance"]["runtime"])
            self.assertEqual(len(output["provenance"]["input_sha256"]), 64)

    def test_cli_rejects_unclassified_input(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            input_path = temporary / "input.json"
            input_path.write_text(json.dumps({"windows": synthetic_windows()}), encoding="utf-8")
            arguments = [
                "run_baselines.py",
                "--input", str(input_path),
                "--config", str(root / "ml" / "config" / "pr19_baselines_v1.json"),
                "--output", str(temporary / "output.json"),
                "--code-version", "pr19-test",
            ]
            with patch.object(sys, "argv", arguments), self.assertRaisesRegex(SystemExit, "Input rejected"):
                run_cli()


if __name__ == "__main__":
    unittest.main()
