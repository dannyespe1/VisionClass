import unittest
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError

from ml.temporal_api import (
    TemporalInferenceEngine,
    TemporalInferenceError,
    TemporalInferenceRequest,
    load_state_artifact,
)


ROOT = Path(__file__).resolve().parents[1]


def request(events=None, model_id="observable-evidence-hmm-v1"):
    return TemporalInferenceRequest(
        contract_version="1.0",
        inference_id=uuid4(),
        window_id=1,
        model_id=model_id,
        events=events or [
            {"timestamp_ms": 0, "observable": True, "probability": 0.8},
            {"timestamp_ms": 5000, "observable": True, "probability": 0.85},
        ],
    )


class TemporalInferenceEngineTests(unittest.TestCase):
    def setUp(self):
        artifact = load_state_artifact(ROOT / "docs" / "PR20" / "SYNTHETIC_STATE_MODEL.json")
        self.engine = TemporalInferenceEngine(artifact)

    def test_contract_exposes_state_quality_and_version_without_parameters(self):
        output = self.engine.infer(request())
        self.assertEqual(output["state"], "task_oriented_evidence")
        self.assertEqual(output["contract_version"], "1.0")
        self.assertTrue(output["quality"]["observable"])
        self.assertFalse(output["allow_intervention"])
        self.assertNotIn("transition", output)
        self.assertNotIn("emission_mean", output)

    def test_no_observable_is_explicit(self):
        output = self.engine.infer(request(events=[
            {"timestamp_ms": 0, "observable": False, "probability": None}
        ]))
        self.assertEqual(output["state"], "no_observable")
        self.assertFalse(output["quality"]["observable"])
        self.assertIsNone(output["quality"]["confidence"])

    def test_model_version_mismatch_is_definitive(self):
        with self.assertRaises(TemporalInferenceError) as context:
            self.engine.infer(request(model_id="different-model-v1"))
        self.assertFalse(context.exception.retryable)

    def test_window_limit_is_definitive(self):
        engine = TemporalInferenceEngine(self.engine.artifact, max_events=1)
        with self.assertRaises(TemporalInferenceError) as context:
            engine.infer(request())
        self.assertEqual(context.exception.code, "window_too_large")
        self.assertFalse(context.exception.retryable)

    def test_timeout_is_retryable(self):
        ticks = iter([0.0, 1.0])
        engine = TemporalInferenceEngine(
            self.engine.artifact, timeout_ms=10, clock=lambda: next(ticks)
        )
        with self.assertRaises(TemporalInferenceError) as context:
            engine.infer(request())
        self.assertEqual(context.exception.code, "inference_timeout")
        self.assertTrue(context.exception.retryable)

    def test_contract_rejects_raw_or_unknown_fields(self):
        with self.assertRaises(ValidationError):
            TemporalInferenceRequest(
                contract_version="1.0",
                inference_id=uuid4(),
                window_id=1,
                model_id="observable-evidence-hmm-v1",
                events=[{
                    "timestamp_ms": 0,
                    "observable": True,
                    "probability": 0.8,
                    "image": "forbidden",
                }],
            )


if __name__ == "__main__":
    unittest.main()
