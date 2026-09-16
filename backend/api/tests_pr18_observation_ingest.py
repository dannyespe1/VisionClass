from datetime import timedelta
import uuid

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ConsentEvent, Course, Enrollment, Observation, Session, User


@override_settings(
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="test-v1",
    NORMALIZED_FEATURES_V1=True,
    QUALITY_GATE_V1=True,
    STRICT_EVENT_IDENTITY=True,
)
class ObservationIngestTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="edge-student", role=User.ROLE_STUDENT)
        course = Course.objects.create(title="Synthetic Edge", owner=self.student)
        Enrollment.objects.create(user=self.student, course=course, status=Enrollment.STATUS_ACTIVE)
        self.session = Session.objects.create(course=course, student=self.student, created_by=self.student, started_at=timezone.now())
        self.client.force_authenticate(self.student)

    def grant_capture(self):
        for purpose in (ConsentEvent.PURPOSE_LOCAL_PROCESSING, ConsentEvent.PURPOSE_DERIVED_PERSISTENCE):
            ConsentEvent.objects.create(participant=self.student, purpose=purpose, action=ConsentEvent.ACTION_GRANT, version="test-v1", expires_at=timezone.now() + timedelta(days=1))

    def event(self):
        return {
            "contract_version": "2.0",
            "event_id": str(uuid.uuid4()),
            "session_type": "course",
            "session_id": self.session.pk,
            "captured_at": timezone.now().isoformat(),
            "features": {
                "face_present": 1, "face_count": 1, "face_center_x": 0.5, "face_center_y": 0.5,
                "face_width": 0.4, "face_height": 0.5, "eye_span": 0.2, "head_roll": 0.0,
                "gaze_horizontal_proxy": 0.5, "pose_available": 1, "gaze_available": 1,
                "window_offset_ms": 1000, "window_duration_ms": 5000, "profile_generation": 1,
            },
            "quality": {"observable": True, "confidence": 0.8, "reason": None},
            "device": {"class": "laptop", "browser_family": "chromium", "extractor_version": "browser-face-detector-v1", "preprocessing_version": "normalized-features-v1", "execution_profile": "balanced"},
            "consent": {"version": "test-v1", "purposes": ["local_processing", "derived_persistence"]},
        }

    @override_settings(NORMALIZED_FEATURES_V1=False)
    def test_flags_fail_closed(self):
        self.assertEqual(self.client.post("/api/observations/", self.event(), format="json").status_code, 503)

    def test_requires_current_capture_consent(self):
        self.assertEqual(self.client.post("/api/observations/", self.event(), format="json").status_code, 403)

    def test_persists_only_normalized_observation_and_is_idempotent(self):
        self.grant_capture()
        payload = self.event()
        first = self.client.post("/api/observations/", payload, format="json")
        second = self.client.post("/api/observations/", payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.data["duplicate"])
        self.assertEqual(Observation.objects.count(), 1)
        observation = Observation.objects.get()
        self.assertEqual(observation.kind, "normalized_browser_features")
        self.assertNotIn("image", observation.values)
        self.assertEqual(observation.provenance["execution_profile"], "balanced")

    def test_rejects_visual_or_unknown_payload_fields(self):
        self.grant_capture()
        payload = self.event()
        payload["image"] = "data:image/jpeg;base64,forbidden"
        self.assertEqual(self.client.post("/api/observations/", payload, format="json").status_code, 400)
        payload = self.event()
        payload["features"]["user_id"] = self.student.pk
        self.assertEqual(self.client.post("/api/observations/", payload, format="json").status_code, 400)
