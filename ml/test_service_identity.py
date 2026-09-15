import unittest

from service_identity import ServiceIdentityConfig, ServiceIdentityError, authorize_service


CURRENT = "current-test-token-0000000000000001"
PREVIOUS = "previous-test-token-000000000000001"


class ServiceIdentityTests(unittest.TestCase):
    def config(self, **changes):
        values = {
            "enabled": True,
            "current_token": CURRENT,
            "previous_token": PREVIOUS,
            "scopes": ("frames:analyze", "events:consume", "models:read"),
        }
        values.update(changes)
        return ServiceIdentityConfig.build(**values)

    def test_current_and_previous_tokens_allow_rotation_overlap(self):
        self.assertEqual(authorize_service(f"Service {CURRENT}", "frames:analyze", self.config()), "current")
        self.assertEqual(authorize_service(f"Service {PREVIOUS}", "frames:analyze", self.config()), "previous")

    def test_revoked_token_and_missing_scope_are_denied(self):
        with self.assertRaises(ServiceIdentityError) as revoked:
            authorize_service(f"Service {PREVIOUS}", "frames:analyze", self.config(previous_token=""))
        self.assertEqual(revoked.exception.status_code, 401)

        with self.assertRaises(ServiceIdentityError) as scoped:
            authorize_service(f"Service {CURRENT}", "admin:users", self.config())
        self.assertEqual(scoped.exception.status_code, 403)

    def test_disabled_or_missing_identity_fails_closed(self):
        with self.assertRaises(ServiceIdentityError) as disabled:
            authorize_service(f"Service {CURRENT}", "frames:analyze", self.config(enabled=False))
        self.assertEqual(disabled.exception.status_code, 503)

        with self.assertRaises(ServiceIdentityError) as missing:
            authorize_service(None, "frames:analyze", self.config())
        self.assertEqual(missing.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
