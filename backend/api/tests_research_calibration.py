from datetime import timedelta

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ConsentEvent, ContentView, Course, Enrollment, ResearchCalibration, Session, User


@override_settings(
    RESEARCH_SESSION_CALIBRATION_REQUIRED=True,
    OCULAR_CALIBRATION_MIN_SAMPLES=20,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="calibration-test-v1",
)
class ResearchCalibrationAPITests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="calibration-student", password="test-only", role=User.ROLE_STUDENT
        )
        teacher = User.objects.create_user(
            username="calibration-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.course = Course.objects.create(title="Calibration pilot", owner=teacher)
        Enrollment.objects.create(user=self.student, course=self.course, status=Enrollment.STATUS_ACTIVE)
        self.session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        expires = timezone.now() + timedelta(days=1)
        for purpose, _ in ConsentEvent.PURPOSE_CHOICES:
            ConsentEvent.objects.create(
                participant=self.student,
                version="calibration-test-v1",
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                expires_at=expires,
                source="test",
            )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def payload(self):
        return {
            "session_id": self.session.id,
            "calibration_version": "ocular-local-v2",
            "execution_profile": "low",
            "sample_counts": {
                "frontal": 20,
                "eyes_left": 20,
                "eyes_right": 20,
                "front_return": 20,
            },
            "quality": {
                "status": "ready",
                "directional_separation": 0.18,
                "center_drift": 0.03,
                "center_is_between_directions": True,
            },
            "duration_ms": 24000,
        }

    def test_content_is_closed_until_server_accepts_calibration(self):
        blocked = self.client.post(
            "/api/content-views/",
            {"session_id": self.session.id, "content_type": "pdf", "content_id": "material:1"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 403)
        self.assertFalse(ContentView.objects.exists())

        accepted = self.client.post(reverse("research-calibrations"), self.payload(), format="json")
        self.assertEqual(accepted.status_code, 201)
        self.assertTrue(accepted.data["ready"])

        allowed = self.client.post(
            "/api/content-views/",
            {"session_id": self.session.id, "content_type": "pdf", "content_id": "material:1"},
            format="json",
        )
        self.assertEqual(allowed.status_code, 201)

    def test_insufficient_or_unstable_calibration_is_rejected(self):
        payload = self.payload()
        payload["sample_counts"]["eyes_left"] = 19
        response = self.client.post(reverse("research-calibrations"), payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ResearchCalibration.objects.exists())

        payload = self.payload()
        payload["quality"]["directional_separation"] = True
        response = self.client.post(reverse("research-calibrations"), payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ResearchCalibration.objects.exists())

        payload = self.payload()
        payload["quality"]["center_drift"] = 0.2
        response = self.client.post(reverse("research-calibrations"), payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ResearchCalibration.objects.exists())

    def test_research_consent_is_required_and_raw_visual_data_is_not_accepted(self):
        ConsentEvent.objects.create(
            participant=self.student,
            version="calibration-test-v1",
            purpose=ConsentEvent.PURPOSE_RESEARCH,
            action=ConsentEvent.ACTION_REVOKE,
            source="test",
        )
        response = self.client.post(reverse("research-calibrations"), self.payload(), format="json")
        self.assertEqual(response.status_code, 409)
        self.assertFalse(ResearchCalibration.objects.exists())

        fields = {field.name for field in ResearchCalibration._meta.fields}
        self.assertFalse(fields & {"image", "video", "frame", "landmarks", "camera_id"})

    def test_participant_cannot_calibrate_another_students_session(self):
        other = User.objects.create_user(username="other-student", role=User.ROLE_STUDENT)
        other_session = Session.objects.create(
            course=self.course,
            student=other,
            created_by=other,
            started_at=timezone.now(),
        )
        payload = self.payload()
        payload["session_id"] = other_session.id
        response = self.client.post(reverse("research-calibrations"), payload, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ResearchCalibration.objects.exists())
