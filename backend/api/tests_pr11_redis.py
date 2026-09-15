from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from .redis_client import redis_health


class RedisHealthTests(SimpleTestCase):
    @override_settings(REDIS_ENABLED=False)
    def test_disabled_is_explicit(self):
        self.assertEqual(redis_health(), {"status": "disabled"})

    @override_settings(REDIS_ENABLED=True)
    @patch("api.redis_client.get_redis_client")
    def test_ping_reports_ready(self, get_client):
        get_client.return_value = Mock()
        self.assertEqual(redis_health(), {"status": "ok"})
        get_client.return_value.ping.assert_called_once()

    @override_settings(REDIS_ENABLED=True)
    @patch("api.redis_client.get_redis_client", side_effect=ConnectionError)
    def test_failure_is_not_silent(self, _get_client):
        self.assertEqual(redis_health(), {"status": "error"})
