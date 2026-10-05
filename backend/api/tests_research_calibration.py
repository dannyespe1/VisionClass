from datetime import timedelta

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ConsentEvent, ContentView, Course, Enrollment, ResearchCalibration, Session, User


@override_settings(
    RESEARCH_SESSION_CALIBRATION_REQUIRED=True,
    OCULAR_CALIBRATION_MIN_SAMPLES=20,
    OCULAR_CALIBRATION_REUSE_ENABLED=True,
    OCULAR_CALIBRATION_REUSE_HOURS=12,
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

    def test_valid_proof_reuses_aggregate_calibration_in_another_course_session(self):
        accepted = self.client.post(reverse("research-calibrations"), self.payload(), format="json")
        self.assertEqual(accepted.status_code, 201)
        reuse_token = accepted.data["reuse_token"]
        source = ResearchCalibration.objects.get(session=self.session)
        self.assertNotEqual(source.reuse_token_hash, reuse_token)
        self.assertNotIn(reuse_token, str(source.quality))

        second_course = Course.objects.create(title="Second course", owner=self.course.owner)
        Enrollment.objects.create(user=self.student, course=second_course, status=Enrollment.STATUS_ACTIVE)
        second_session = Session.objects.create(
            course=second_course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        reused = self.client.post(
            reverse("research-calibrations-reuse"),
            {"session_id": second_session.id, "reuse_token": reuse_token},
            format="json",
        )
        self.assertEqual(reused.status_code, 201)
        copied = ResearchCalibration.objects.get(session=second_session)
        self.assertEqual(copied.participant, self.student)
        self.assertEqual(copied.sample_counts, source.sample_counts)
        self.assertEqual(copied.quality, source.quality)
        self.assertEqual(copied.valid_until, source.valid_until)

    def test_reuse_fails_closed_for_wrong_participant_expiry_and_revoked_consent(self):
        accepted = self.client.post(reverse("research-calibrations"), self.payload(), format="json")
        reuse_token = accepted.data["reuse_token"]

        other = User.objects.create_user(username="reuse-other", role=User.ROLE_STUDENT)
        Enrollment.objects.create(user=other, course=self.course, status=Enrollment.STATUS_ACTIVE)
        other_session = Session.objects.create(
            course=self.course,
            student=other,
            created_by=other,
            started_at=timezone.now(),
        )
        for purpose, _ in ConsentEvent.PURPOSE_CHOICES:
            ConsentEvent.objects.create(
                participant=other,
                version="calibration-test-v1",
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                expires_at=timezone.now() + timedelta(days=1),
                source="test",
            )
        self.client.force_authenticate(other)
        denied = self.client.post(
            reverse("research-calibrations-reuse"),
            {"session_id": other_session.id, "reuse_token": reuse_token},
            format="json",
        )
        self.assertEqual(denied.status_code, 409)

        self.client.force_authenticate(self.student)
        source = ResearchCalibration.objects.get(session=self.session)
        source.valid_until = timezone.now() - timedelta(seconds=1)
        source.save(update_fields=["valid_until"])
        expired = self.client.post(
            reverse("research-calibrations-reuse"),
            {"session_id": self.session.id, "reuse_token": reuse_token},
            format="json",
        )
        self.assertEqual(expired.status_code, 409)

        source.valid_until = timezone.now() + timedelta(hours=1)
        source.save(update_fields=["valid_until"])
        ConsentEvent.objects.create(
            participant=self.student,
            version="calibration-test-v1",
            purpose=ConsentEvent.PURPOSE_RESEARCH,
            action=ConsentEvent.ACTION_REVOKE,
            source="test",
        )
        revoked = self.client.post(
            reverse("research-calibrations-reuse"),
            {"session_id": self.session.id, "reuse_token": reuse_token},
            format="json",
        )
        self.assertEqual(revoked.status_code, 409)

    @override_settings(OCULAR_CALIBRATION_REUSE_ENABLED=False)
    def test_reuse_flag_disables_token_issuance_and_endpoint(self):
        accepted = self.client.post(reverse("research-calibrations"), self.payload(), format="json")
        self.assertEqual(accepted.status_code, 201)
        self.assertIsNone(accepted.data["reuse_token"])
        calibration = ResearchCalibration.objects.get(session=self.session)
        self.assertEqual(calibration.reuse_token_hash, "")
        self.assertIsNone(calibration.valid_until)

        denied = self.client.post(
            reverse("research-calibrations-reuse"),
            {"session_id": self.session.id, "reuse_token": "a" * 43},
            format="json",
        )
        self.assertEqual(denied.status_code, 409)

    def test_new_calibration_invalidates_previous_reuse_token(self):
        first = self.client.post(reverse("research-calibrations"), self.payload(), format="json")
        old_token = first.data["reuse_token"]
        second_session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        second_payload = self.payload()
        second_payload["session_id"] = second_session.id
        second = self.client.post(reverse("research-calibrations"), second_payload, format="json")
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(second.data["reuse_token"], old_token)

        third_session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        denied = self.client.post(
            reverse("research-calibrations-reuse"),
            {"session_id": third_session.id, "reuse_token": old_token},
            format="json",
        )
        self.assertEqual(denied.status_code, 409)
