import json
import unittest
from pathlib import Path

from feature_normalization import normalize_browser_sample


FIXTURES = Path(__file__).resolve().parents[1] / "contracts" / "fixtures"


class FeatureNormalizationTests(unittest.TestCase):
    def fixture(self, name):
        return json.loads((FIXTURES / name).read_text(encoding="utf-8"))

    def test_matches_shared_golden_fixture(self):
        raw = self.fixture("browser-features-v1.raw.json")
        expected = self.fixture("browser-features-v1.normalized-90.json")
        self.assertEqual(normalize_browser_sample(raw, orientation=90), expected)

    def test_missing_values_are_null_not_ambiguous_zero(self):
        value = normalize_browser_sample({
            "captured_at": "2026-09-15T12:00:00Z",
            "features": {"face_present": None},
            "quality": {"observable": False, "reason": "partial_face"},
        })
        self.assertIsNone(value["features"]["face_center_x"])
        self.assertIsNone(value["quality"]["confidence"])
        self.assertEqual(value["quality"]["reason"], "partial_face")


if __name__ == "__main__":
    unittest.main()
