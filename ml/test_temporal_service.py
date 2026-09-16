import asyncio
import os
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from ml import ml_service
from ml.temporal_api import TemporalInferenceEngine, load_state_artifact


TOKEN = "temporal-caller-token-with-at-least-32-characters"
ROOT = Path(__file__).resolve().parents[1]


class TemporalServiceEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        artifact = load_state_artifact(ROOT / "docs" / "PR20" / "SYNTHETIC_STATE_MODEL.json")
        cls.engine = TemporalInferenceEngine(artifact)

    def payload(self):
        return {
            "contract_version": "1.0",
            "inference_id": str(uuid4()),
            "window_id": 1,
            "model_id": "observable-evidence-hmm-v1",
            "events": [
                {"timestamp_ms": 0, "observable": True, "probability": 0.8}
            ],
        }

    def call(self, payload, authorization=f"Service {TOKEN}"):
        async def persisted(_result):
            return True

        environment = {
            "ML_SERVICE_IDENTITY": "1",
            "BFF_SERVICE_TOKEN": TOKEN,
            "BFF_PREVIOUS_SERVICE_TOKEN": "",
            "BFF_SERVICE_SCOPES": "temporal:infer",
        }
        with patch.dict(os.environ, environment, clear=False), patch.object(
            ml_service, "temporal_engine", self.engine
        ), patch.object(ml_service, "_persist_temporal_result", persisted):
            return asyncio.run(
                ml_service.infer_temporal_window(payload, authorization=authorization)
            )

    def test_authenticated_request_is_inferred_and_persisted(self):
        output = self.call(self.payload())
        self.assertTrue(output["persisted"])
        self.assertFalse(output["allow_intervention"])

    def test_invalid_contract_has_definitive_classification(self):
        payload = self.payload()
        payload["events"][0]["image"] = "forbidden"
        response = self.call(payload)
        self.assertEqual(response.status_code, 422)
        self.assertIn(b'"classification":"definitive"', response.body)

    def test_missing_service_identity_is_definitive(self):
        response = self.call(self.payload(), authorization=None)
        self.assertEqual(response.status_code, 401)
        self.assertIn(b'"classification":"definitive"', response.body)


if __name__ == "__main__":
    unittest.main()
