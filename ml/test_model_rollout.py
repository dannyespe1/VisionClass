import unittest
from dataclasses import replace
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from ml.model_rollout import RolloutConfig, RolloutCoordinator
from ml.temporal_api import TemporalInferenceEngine, TemporalInferenceRequest, load_state_artifact


ROOT = Path(__file__).resolve().parents[1]


def request(inference_id):
    return TemporalInferenceRequest(
        contract_version="1.0",
        inference_id=inference_id,
        window_id=1,
        model_id="observable-evidence-hmm-v1",
        events=[{"timestamp_ms": 0, "observable": True, "probability": 0.8}],
    )


class FailingEngine:
    def __init__(self, artifact):
        self.artifact = artifact

    def infer(self, _request):
        raise RuntimeError("controlled_candidate_failure")


class ModelRolloutCoordinatorTests(unittest.TestCase):
    def setUp(self):
        active_artifact = load_state_artifact(ROOT / "docs" / "PR20" / "SYNTHETIC_STATE_MODEL.json")
        candidate_artifact = replace(
            active_artifact,
            artifact_version="candidate-observable-evidence-hmm-v2",
            emission_mean=(0.9, 0.1),
        )
        self.active = TemporalInferenceEngine(active_artifact)
        self.candidate = TemporalInferenceEngine(candidate_artifact)

    def test_shadow_output_is_always_active_and_candidate_result_is_not_exposed(self):
        coordinator = RolloutCoordinator(
            self.active,
            self.candidate,
            RolloutConfig("test", "temporal-default", mode="shadow"),
        )
        output = coordinator.infer(request(uuid5(NAMESPACE_URL, "shadow")))
        self.assertEqual(output["model_id"], self.active.artifact.artifact_version)
        self.assertEqual(output["state"], "task_oriented_evidence")
        self.assertEqual(output["rollout"]["selection_reason"], "shadow_isolation")
        self.assertFalse(output["rollout"]["outputs_agree"])
        self.assertNotIn("candidate_result", output)

    def test_canary_selection_is_deterministic(self):
        coordinator = RolloutCoordinator(
            self.active,
            self.candidate,
            RolloutConfig("test", "temporal-default", mode="canary", canary_percentage=10),
        )
        selected_id = next(
            uuid5(NAMESPACE_URL, f"canary:{index}")
            for index in range(1000)
            if coordinator._candidate_selected(str(uuid5(NAMESPACE_URL, f"canary:{index}")))
        )
        first = coordinator.infer(request(selected_id))
        second = coordinator.infer(request(selected_id))
        self.assertEqual(first["model_id"], self.candidate.artifact.artifact_version)
        self.assertEqual(first["model_id"], second["model_id"])
        self.assertEqual(first["rollout"]["selected_role"], "candidate")

    def test_candidate_failure_falls_back_to_active(self):
        coordinator = RolloutCoordinator(
            self.active,
            FailingEngine(self.candidate.artifact),
            RolloutConfig("test", "temporal-default", mode="canary", canary_percentage=50),
        )
        selected_id = next(
            uuid5(NAMESPACE_URL, f"failure:{index}")
            for index in range(1000)
            if coordinator._candidate_selected(str(uuid5(NAMESPACE_URL, f"failure:{index}")))
        )
        output = coordinator.infer(request(selected_id))
        self.assertEqual(output["model_id"], self.active.artifact.artifact_version)
        self.assertEqual(output["rollout"]["selection_reason"], "candidate_error_fallback")
        self.assertTrue(output["rollout"]["candidate_error"])

    def test_invalid_canary_percentage_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "invalid_canary_percentage"):
            RolloutCoordinator(
                self.active,
                self.candidate,
                RolloutConfig("test", "temporal-default", mode="canary", canary_percentage=75),
            )

    def test_stable_mode_does_not_execute_configured_candidate(self):
        coordinator = RolloutCoordinator(
            self.active,
            FailingEngine(self.candidate.artifact),
            RolloutConfig("test", "temporal-default", mode="stable"),
        )
        output = coordinator.infer(request(uuid5(NAMESPACE_URL, "stable")))
        self.assertEqual(output["model_id"], self.active.artifact.artifact_version)
        self.assertIsNone(output["rollout"]["candidate_model_id"])
        self.assertFalse(output["rollout"]["candidate_error"])


if __name__ == "__main__":
    unittest.main()
