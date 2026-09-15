import unittest

from quality_gate import evaluate_frame, evaluate_window


def sample(at, **features):
    return {"captured_at": at, "features": {"face_present": 1, "luminance_mean": 0.6, "face_edge_margin": 0.1, "pose_available": 1, "gaze_available": 1, **features}, "quality": {"observable": True, "confidence": 0.8}}


class QualityGateTests(unittest.TestCase):
    def test_controlled_signal_failures_have_distinct_reasons(self):
        self.assertEqual(evaluate_frame(sample("2026-09-15T12:00:00Z", luminance_mean=0.05))["reason"], "low_illumination")
        self.assertEqual(evaluate_frame(sample("2026-09-15T12:00:00Z", face_present=0))["reason"], "face_absent")
        self.assertEqual(evaluate_frame(sample("2026-09-15T12:00:00Z", pose_available=0, gaze_available=0))["reason"], "occluded")

    def test_window_blocks_frame_loss(self):
        result = evaluate_window([sample("2026-09-15T12:00:00Z"), sample("2026-09-15T12:00:01Z"), sample("2026-09-15T12:00:05Z")])
        self.assertFalse(result["allow_inference"])
        self.assertEqual(result["reason"], "frame_loss")

    def test_window_allows_continuous_signal_but_never_intervention(self):
        result = evaluate_window([sample("2026-09-15T12:00:00Z"), sample("2026-09-15T12:00:01Z"), sample("2026-09-15T12:00:02Z")])
        self.assertTrue(result["allow_inference"])
        self.assertFalse(result["allow_intervention"])


if __name__ == "__main__":
    unittest.main()
