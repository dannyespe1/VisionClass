import copy
import json
import tempfile
import unittest
from pathlib import Path

from ml.masked_gru_artifact import MaskedGRUInferenceRuntime, write_artifact
from ml.run_neural_temporal_baseline import synthetic_records


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PR24" / "SYNTHETIC_GRU_COMPARISON.json"


class MaskedGRUArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.path = Path(self.temporary.name) / "model.json"
        self.artifact = write_artifact(SOURCE, self.path)

    def tearDown(self):
        self.temporary.cleanup()

    def test_materializes_safe_shadow_artifact(self):
        self.assertEqual(self.artifact["architecture"]["parameter_count"], 465)
        self.assertEqual(self.artifact["lifecycle"]["mode"], "shadow_only")
        self.assertFalse(self.artifact["lifecycle"]["active"])
        self.assertFalse(self.artifact["lifecycle"]["allow_intervention"])
        self.assertFalse(self.artifact["lifecycle"]["requires_raw_media"])

    def test_runtime_predicts_observable_and_no_observable_windows(self):
        runtime = MaskedGRUInferenceRuntime.load(self.path)
        windows = synthetic_records(participants=1)[:7]
        result = runtime.predict(windows)
        self.assertEqual(len(result), 7)
        self.assertIsNotNone(result[0]["probability"])
        self.assertEqual(result[6]["state"], "no_observable")
        self.assertIsNone(result[6]["probability"])
        self.assertTrue(all(row["mode"] == "shadow_only" for row in result))

    def test_modified_weights_are_rejected(self):
        payload = copy.deepcopy(self.artifact)
        payload["weights"]["head.bias"][0] += 0.1
        self.path.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "weights_sha256_mismatch"):
            MaskedGRUInferenceRuntime.load(self.path)

    def test_out_of_range_feature_is_rejected(self):
        runtime = MaskedGRUInferenceRuntime.load(self.path)
        window = synthetic_records(participants=1)[0]
        window["features"]["face_center_x"] = 2.0
        with self.assertRaisesRegex(ValueError, "feature_out_of_range:face_center_x"):
            runtime.predict([window])

    def test_out_of_order_sequence_is_rejected(self):
        runtime = MaskedGRUInferenceRuntime.load(self.path)
        windows = synthetic_records(participants=1)[:2]
        windows[1]["timestamp_ms"] = windows[0]["timestamp_ms"]
        with self.assertRaisesRegex(ValueError, "non_monotonic_timestamp_ms"):
            runtime.predict(windows)


if __name__ == "__main__":
    unittest.main()
