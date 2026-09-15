import json
from pathlib import Path

from django.test import SimpleTestCase
from rest_framework import serializers

from .event_contract import validate_attention_event_v2


FIXTURES = Path(__file__).resolve().parents[2] / "contracts" / "fixtures"


class EventContractV2Tests(SimpleTestCase):
    def fixture(self, name):
        return json.loads((FIXTURES / name).read_text(encoding="utf-8"))

    def test_accepts_shared_valid_fixture(self):
        value = self.fixture("attention-event-v2.valid.json")
        self.assertEqual(validate_attention_event_v2(value), value)

    def test_rejects_shared_invalid_fixture_without_echoing_values(self):
        with self.assertRaises(serializers.ValidationError) as caught:
            validate_attention_event_v2(self.fixture("attention-event-v2.invalid.json"))
        self.assertNotIn("must-not-be-accepted", str(caught.exception))
