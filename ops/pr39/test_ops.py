import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import common
import load_test


class CommonTests(unittest.TestCase):
    def test_percentile_uses_sorted_values(self):
        self.assertEqual(common.percentile([10, 1, 5, 2], 0.95), 10)

    def test_local_url_accepts_loopback(self):
        with mock.patch("socket.getaddrinfo", return_value=[(None, None, None, None, ("127.0.0.1", 80))]):
            self.assertEqual(common.assert_local_url("http://localhost:80/"), "http://localhost:80")

    def test_local_url_rejects_non_loopback(self):
        with mock.patch("socket.getaddrinfo", return_value=[(None, None, None, None, ("203.0.113.10", 443))]):
            with self.assertRaisesRegex(ValueError, "loopback"):
                common.assert_local_url("https://production.example")

    def test_write_json_is_machine_readable(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "result.json"
            common.write_json(path, {"ok": True})
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"ok": True})

    def test_every_alert_has_owner_and_action_and_policy_is_not_self_approved(self):
        policy_path = Path(__file__).resolve().parents[2] / "docs" / "PR39" / "SLO_ALERTAS.json"
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        self.assertEqual(policy["status"], "PROPOSED_NOT_APPROVED")
        self.assertTrue(policy["alerts"])
        for alert in policy["alerts"]:
            self.assertTrue(alert["owner"])
            self.assertTrue(alert["action"])


class LoadTestTests(unittest.TestCase):
    @mock.patch("load_test.assert_local_url", return_value="http://127.0.0.1:18000")
    @mock.patch("load_test.request_once", return_value=(200, 12.5))
    def test_result_contains_percentiles_and_error_budget_inputs(self, request_once, _):
        result = load_test.run("http://127.0.0.1:18000", "target", 4, 2, 1)
        self.assertEqual(result["successes"], 4)
        self.assertEqual(result["error_rate"], 0)
        self.assertEqual(result["latency_ms"]["p99"], 12.5)
        self.assertEqual(request_once.call_count, 4)

    @mock.patch("load_test.assert_local_url", return_value="http://127.0.0.1:18000")
    @mock.patch("load_test.request_once", side_effect=[(0, 1), (200, 1)])
    @mock.patch("load_test.time.sleep")
    def test_preflight_waits_for_readiness(self, sleep, request_once, _):
        load_test.wait_until_ready("http://127.0.0.1:18000", timeout=1)
        self.assertEqual(request_once.call_count, 2)
        sleep.assert_called_once_with(0.25)


if __name__ == "__main__":
    unittest.main()
