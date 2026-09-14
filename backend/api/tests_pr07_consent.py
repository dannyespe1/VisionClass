from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ConsentEvent, D2RAttentionEvent, D2RSession, User


@override_settings(
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="test-v1",
    D2R_ENABLED=True,
)
class ConsentV2Tests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="student", role=User.ROLE_STUDENT)
        self.teacher = User.objects.create_user(username="teacher", role=User.ROLE_TEACHER)

    def grant_capture(self, user=None, *, expires_at=None, version="test-v1"):
        participant = user or self.student
        expiry = expires_at or timezone.now() + timedelta(days=1)
        for purpose in (ConsentEvent.PURPOSE_LOCAL_PROCESSING, ConsentEvent.PURPOSE_DERIVED_PERSISTENCE):
            ConsentEvent.objects.create(
                participant=participant,
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                version=version,
                expires_at=expiry,
            )

    def test_absent_consent_denies_capture(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/consents/status/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["capture_allowed"])
        self.assertFalse(response.data["teacher_access"])
        self.assertFalse(response.data["images_stored"])

    @override_settings(CONSENT_TEXT_APPROVED=False)
    def test_pending_text_rejects_grant(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/consents/", {
            "version": "test-v1", "purpose": "local_processing", "action": "grant",
            "expires_at": (timezone.now() + timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, 403)

    def test_purposes_are_independent_and_both_required_for_capture(self):
        self.client.force_authenticate(self.student)
        expiry = (timezone.now() + timedelta(days=1)).isoformat()
        local = self.client.post("/api/consents/", {
            "version": "test-v1", "purpose": "local_processing", "action": "grant", "expires_at": expiry
        })
        self.assertEqual(local.status_code, 201)
        self.assertFalse(self.client.get("/api/consents/status/").data["capture_allowed"])
        derived = self.client.post("/api/consents/", {
            "version": "test-v1", "purpose": "derived_persistence", "action": "grant", "expires_at": expiry
        })
        self.assertEqual(derived.status_code, 201)
        self.assertTrue(self.client.get("/api/consents/status/").data["capture_allowed"])

    def test_grant_without_expiration_is_rejected(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/consents/", {
            "version": "test-v1", "purpose": "local_processing", "action": "grant"
        })
        self.assertEqual(response.status_code, 400)

    def test_revocation_stops_new_events_immediately(self):
        self.grant_capture()
        d2r_session = D2RSession.objects.create(user=self.student, started_at=timezone.now())
        self.client.force_authenticate(self.student)
        payload = {
            "d2r_session_id": d2r_session.id,
            "user_id": self.student.id,
            "timestamp": timezone.now().isoformat(),
            "value": 0.8,
        }
        self.assertEqual(
            self.client.post(
                "/api/d2r-attention-events/", payload, HTTP_IDEMPOTENCY_KEY="pr07-before-revoke"
            ).status_code,
            201,
        )
        ConsentEvent.objects.create(
            participant=self.student, version="test-v1", purpose="local_processing", action="revoke"
        )
        self.assertEqual(
            self.client.post(
                "/api/d2r-attention-events/", payload, HTTP_IDEMPOTENCY_KEY="pr07-after-revoke"
            ).status_code,
            403,
        )
        self.assertEqual(D2RAttentionEvent.objects.count(), 1)

    def test_expired_and_old_version_grants_are_invalid(self):
        self.grant_capture(expires_at=timezone.now() - timedelta(seconds=1))
        self.client.force_authenticate(self.student)
        self.assertFalse(self.client.get("/api/consents/status/").data["capture_allowed"])
        ConsentEvent.objects.all().delete()
        self.grant_capture(version="old-v0")
        self.assertFalse(self.client.get("/api/consents/status/").data["capture_allowed"])

    def test_event_is_immutable(self):
        event = ConsentEvent.objects.create(
            participant=self.student, version="test-v1", purpose="research", action="decline"
        )
        event.action = "grant"
        with self.assertRaises(ValidationError):
            event.save()
        with self.assertRaises(ValidationError):
            event.delete()

    def test_teacher_cannot_decide_or_read_student_consent(self):
        self.grant_capture()
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.get("/api/consents/").status_code, 200)
        self.assertEqual(self.client.get("/api/consents/").data, [])
        response = self.client.post("/api/consents/", {
            "version": "test-v1", "purpose": "research", "action": "grant",
            "expires_at": (timezone.now() + timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, 403)

    @override_settings(CONSENT_V2_ENABLED=False)
    def test_disabled_flag_fails_closed(self):
        self.grant_capture()
        self.client.force_authenticate(self.student)
        self.assertFalse(self.client.get("/api/consents/status/").data["capture_allowed"])
