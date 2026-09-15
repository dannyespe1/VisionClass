from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AttentionEvent, ConsentEvent, Course, Enrollment, Session, User


CURRENT_TOKEN = "current-test-token-0000000000000001"
PREVIOUS_TOKEN = "previous-test-token-000000000000001"


@override_settings(
    STRICT_EVENT_IDENTITY=True,
    EVENT_SESSION_MAX_AGE_MINUTES=480,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="test-v1",
    ML_SERVICE_IDENTITY=True,
    ML_SERVICE_TOKEN=CURRENT_TOKEN,
    ML_SERVICE_PREVIOUS_TOKEN=PREVIOUS_TOKEN,
    ML_SERVICE_SCOPES=("events:write",),
    ML_EVENT_MAX_BYTES=16384,
)
class MLServiceIdentityTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="student-pr04", role=User.ROLE_STUDENT)
        self.teacher = User.objects.create_user(username="teacher-pr04", role=User.ROLE_TEACHER)
        self.course = Course.objects.create(title="Course PR04", owner=self.teacher)
        Enrollment.objects.create(user=self.student, course=self.course, status=Enrollment.STATUS_ACTIVE)
        self.session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        for purpose in (
            ConsentEvent.PURPOSE_LOCAL_PROCESSING,
            ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
        ):
            ConsentEvent.objects.create(
                participant=self.student,
                version="test-v1",
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                expires_at=timezone.now() + timedelta(days=1),
            )

    def payload(self, **extra):
        return {
            "session_id": self.session.id,
            "timestamp": timezone.now().isoformat(),
            "value": 0.7,
            "label": "observable",
            "data": {"observation": {"face": True}},
            **extra,
        }

    def post(self, token=CURRENT_TOKEN, key="ml:event:pr04:0001", payload=None):
        headers = {"HTTP_IDEMPOTENCY_KEY": key}
        if token is not None:
            headers["HTTP_AUTHORIZATION"] = f"Service {token}"
        return self.client.post(
            "/api/internal/ml/events/",
            payload or self.payload(),
            format="json",
            **headers,
        )

    def test_current_service_identity_writes_derived_event(self):
        response = self.post()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = AttentionEvent.objects.get()
        self.assertEqual(event.user, self.student)
        self.assertEqual(event.session, self.session)
        self.assertEqual(event.idempotency_key, "ml:event:pr04:0001")

    def test_previous_token_supports_overlap_rotation(self):
        response = self.post(token=PREVIOUS_TOKEN, key="ml:event:pr04:0002")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @override_settings(ML_SERVICE_PREVIOUS_TOKEN="")
    def test_removed_previous_token_is_revoked(self):
        response = self.post(token=PREVIOUS_TOKEN, key="ml:event:pr04:0003")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(AttentionEvent.objects.count(), 0)

    def test_missing_or_invalid_credentials_fail_closed(self):
        missing = self.post(token=None, key="ml:event:pr04:0004")
        invalid = self.post(token="invalid-token-value-00000000000000", key="ml:event:pr04:0005")

        self.assertEqual(missing.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(invalid.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(AttentionEvent.objects.count(), 0)

    @override_settings(ML_SERVICE_IDENTITY=False)
    def test_disabled_identity_feature_fails_closed(self):
        response = self.post(key="ml:event:pr04:0006")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(ML_SERVICE_SCOPES=("models:read",))
    def test_wrong_scope_is_denied(self):
        response = self.post(key="ml:event:pr04:0007")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AttentionEvent.objects.count(), 0)

    def test_claimed_user_and_raw_media_are_rejected(self):
        claimed = self.post(
            key="ml:event:pr04:0008",
            payload=self.payload(user_id=self.teacher.id),
        )
        raw = self.post(
            key="ml:event:pr04:0009",
            payload=self.payload(data={"image": "base64-content"}),
        )

        self.assertEqual(claimed.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(raw.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AttentionEvent.objects.count(), 0)

    def test_replay_is_rejected_and_aggregate_changes_once(self):
        first = self.post(key="ml:event:pr04:0010")
        second = self.post(key="ml:event:pr04:0010")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(AttentionEvent.objects.count(), 1)
        self.session.refresh_from_db()
        self.assertEqual(self.session.frame_count, 1)

    def test_consent_revocation_stops_service_write(self):
        ConsentEvent.objects.create(
            participant=self.student,
            version="test-v1",
            purpose=ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
            action=ConsentEvent.ACTION_REVOKE,
        )

        response = self.post(key="ml:event:pr04:0011")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AttentionEvent.objects.count(), 0)

    def test_legacy_admin_service_account_command_is_retired(self):
        with self.assertRaises(CommandError):
            call_command("create_ml_service_user")
