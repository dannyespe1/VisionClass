import json
import unittest
from pathlib import Path

from ml.state_model import (
    EvidenceStateFilter,
    NO_OBSERVABLE,
    StateModelConfig,
    fit_state_model,
    smooth_sequence,
)


def synthetic_sequences():
    sequences = []
    for sequence_index in range(8):
        events = []
        timestamp = 0
        labels = (["off_task_evidence"] * 4 + ["task_oriented_evidence"] * 5)
        if sequence_index % 2:
            labels = list(reversed(labels))
        for event_index, label in enumerate(labels):
            probability = 0.18 + 0.01 * (event_index % 3) if label == "off_task_evidence" else 0.82 - 0.01 * (event_index % 3)
            events.append({
                "timestamp_ms": timestamp,
                "observable": True,
                "probability": probability,
                "label": label,
            })
            timestamp += 5000
        sequences.append(events)
    return sequences


class StateModelTrainingTests(unittest.TestCase):
    def test_training_is_reproducible_and_recovers_persistence(self):
        config = StateModelConfig()
        first = fit_state_model(synthetic_sequences(), config).as_dict()
        second = fit_state_model(synthetic_sequences(), config).as_dict()
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))
        self.assertGreater(first["transition"][0][0], first["transition"][0][1])
        self.assertGreater(first["transition"][1][1], first["transition"][1][0])
        self.assertLess(first["emission_mean"][0], first["emission_mean"][1])

    def test_out_of_order_training_data_is_rejected(self):
        sequence = synthetic_sequences()[0]
        sequence[2], sequence[3] = sequence[3], sequence[2]
        with self.assertRaisesRegex(ValueError, "event_out_of_order"):
            fit_state_model([sequence], StateModelConfig())


class StateModelInferenceTests(unittest.TestCase):
    def setUp(self):
        self.artifact = fit_state_model(synthetic_sequences(), StateModelConfig())

    def test_filter_returns_distribution_and_uncertainty(self):
        state_filter = EvidenceStateFilter(self.artifact)
        output = state_filter.update({"timestamp_ms": 0, "observable": True, "probability": 0.85})
        self.assertEqual(output["evidence_state"], "task_oriented_evidence")
        self.assertAlmostEqual(sum(output["posterior"].values()), 1.0)
        self.assertGreaterEqual(output["uncertainty"], 0.0)
        self.assertLessEqual(output["uncertainty"], 1.0)
        self.assertFalse(output["allow_intervention"])

    def test_no_observable_never_becomes_negative_and_resets_segment(self):
        state_filter = EvidenceStateFilter(self.artifact)
        state_filter.update({"timestamp_ms": 0, "observable": True, "probability": 0.85})
        missing = state_filter.update({"timestamp_ms": 5000, "observable": False, "probability": None})
        self.assertEqual(missing["evidence_state"], NO_OBSERVABLE)
        self.assertEqual(missing["reset_reason"], None)
        with self.assertRaisesRegex(ValueError, "event_out_of_order"):
            state_filter.update({"timestamp_ms": 4000, "observable": True, "probability": 0.2})
        resumed = state_filter.update({"timestamp_ms": 10000, "observable": True, "probability": 0.2})
        self.assertEqual(resumed["evidence_state"], "off_task_evidence")

    def test_long_gap_short_window_manual_reset_and_ordering(self):
        state_filter = EvidenceStateFilter(self.artifact)
        first = state_filter.update({"timestamp_ms": 0, "observable": True, "probability": 0.8})
        self.assertIsNone(first["reset_reason"])
        gap = state_filter.update({"timestamp_ms": 20000, "observable": True, "probability": 0.8})
        self.assertEqual(gap["reset_reason"], "gap_reset")
        with self.assertRaisesRegex(ValueError, "event_out_of_order"):
            state_filter.update({"timestamp_ms": 15000, "observable": True, "probability": 0.8})
        state_filter.reset()
        reset = state_filter.update({"timestamp_ms": 1000, "observable": True, "probability": 0.2})
        self.assertEqual(reset["evidence_state"], "off_task_evidence")

    def test_smoothing_handles_transitions_and_no_observable(self):
        events = [
            {"timestamp_ms": 0, "observable": True, "probability": 0.2},
            {"timestamp_ms": 5000, "observable": True, "probability": 0.25},
            {"timestamp_ms": 10000, "observable": False, "probability": None},
            {"timestamp_ms": 15000, "observable": True, "probability": 0.8},
            {"timestamp_ms": 20000, "observable": True, "probability": 0.85},
        ]
        output = smooth_sequence(events, self.artifact)
        self.assertEqual(len(output), len(events))
        self.assertEqual(output[2]["evidence_state"], NO_OBSERVABLE)
        self.assertEqual(output[0]["evidence_state"], "off_task_evidence")
        self.assertEqual(output[-1]["evidence_state"], "task_oriented_evidence")

    def test_versioned_artifact_matches_pipeline(self):
        path = Path(__file__).resolve().parents[1] / "docs" / "PR20" / "SYNTHETIC_STATE_MODEL.json"
        expected = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(expected["artifact"], self.artifact.as_dict())


if __name__ == "__main__":
    unittest.main()
