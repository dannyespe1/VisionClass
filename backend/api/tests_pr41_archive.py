from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from .event_contract import validate_attention_event_v2
from .models import User


class LegacyAssessmentRetirementTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pr41-student", role=User.ROLE_STUDENT)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_retired_http_surfaces_return_not_found(self):
        retired_paths = (
            "/api/d2r-sessions/",
            "/api/d2r-attention-events/",
            "/api/d2r-results/",
            "/api/d2r-schedules/",
        )
        for path in retired_paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)
                self.assertEqual(self.client.post(path, {}, format="json").status_code, 404)

    def test_retired_feature_flag_is_not_runtime_configuration(self):
        self.assertFalse(hasattr(settings, "D2R_ENABLED"))

    def test_shared_event_contract_accepts_course_only(self):
        payload = {
            "contract_version": "2.0",
            "event_id": "9ef8a36e-ecef-4c38-a608-e69050d91be6",
            "session_type": "d2r",
            "session_id": 1,
            "captured_at": "2026-09-17T12:00:00Z",
            "features": {"attention": 0.8},
            "quality": {"observable": True, "confidence": 0.8, "reason": "ok"},
            "consent": {"version": "test-v1", "purposes": ["local_processing"]},
        }
        with self.assertRaises(Exception):
            validate_attention_event_v2(payload)
