import json
import re

from django.test import TestCase, override_settings


class OperationalObservabilityTests(TestCase):
    def test_generates_correlation_id_and_keeps_payload_out_of_logs(self):
        with override_settings(PRODUCTION_OBSERVABILITY=True):
            with self.assertLogs("visionclass.operations", level="INFO") as logs:
                response = self.client.get("/api/health/live/?student=private-value")

        correlation_id = response.headers["X-Correlation-ID"]
        self.assertRegex(correlation_id, re.compile(r"^[0-9a-f-]{36}$"))
        event = json.loads(logs.records[0].getMessage())
        self.assertEqual(event["route"], "api/health/live/")
        self.assertNotIn("private-value", logs.records[0].getMessage())
        self.assertNotIn("student", logs.records[0].getMessage())

    def test_preserves_safe_correlation_id(self):
        correlation_id = "de305d54-75b4-431b-adb2-eb6b9e546014"
        response = self.client.get(
            "/api/health/live/", HTTP_X_CORRELATION_ID=correlation_id
        )
        self.assertEqual(response.headers["X-Correlation-ID"], correlation_id)
        self.assertEqual(response.json()["correlation_id"], correlation_id)

    def test_replaces_invalid_or_oversized_correlation_id(self):
        response = self.client.get(
            "/api/health/live/", HTTP_X_CORRELATION_ID="invalid value/" + "x" * 128
        )
        self.assertNotIn("invalid", response.headers["X-Correlation-ID"])
        self.assertRegex(response.headers["X-Correlation-ID"], re.compile(r"^[0-9a-f-]{36}$"))

    @override_settings(PRODUCTION_OBSERVABILITY=False)
    def test_flag_off_emits_no_operational_event(self):
        with self.assertNoLogs("visionclass.operations", level="INFO"):
            response = self.client.get("/api/health/live/")
        self.assertEqual(response.status_code, 200)
