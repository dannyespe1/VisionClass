import json
import unittest
from pathlib import Path

from event_contract import validate_attention_event_v2


FIXTURES = Path(__file__).resolve().parents[1] / "contracts" / "fixtures"


class EventContractV2Tests(unittest.TestCase):
    def fixture(self, name):
        return json.loads((FIXTURES / name).read_text(encoding="utf-8"))

    def test_shared_valid_fixture(self):
        value = self.fixture("attention-event-v2.valid.json")
        self.assertEqual(validate_attention_event_v2(value), value)

    def test_shared_invalid_fixture(self):
        with self.assertRaises(ValueError):
            validate_attention_event_v2(self.fixture("attention-event-v2.invalid.json"))


if __name__ == "__main__":
    unittest.main()
