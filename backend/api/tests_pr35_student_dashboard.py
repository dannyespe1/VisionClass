from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ConsentEvent, Course, InferredState, ObservationWindow, Session, TemporalSession, User


@override_settings(
    STUDENT_ATTENTION_DASHBOARD=True,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="pr35-test-v1",
)
class StudentEvidenceDashboardTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="pr35-student", password="test-only", role=User.ROLE_STUDENT
        )
        self.other_student = User.objects.create_user(
            username="pr35-other", password="test-only", role=User.ROLE_STUDENT
        )
        self.teacher = User.objects.create_user(
            username="pr35-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.client.force_authenticate(self.student)

    def create_temporal_session(self, participant, *, minutes_ago=5, ended=True):
        started_at = timezone.now() - timedelta(minutes=minutes_ago)
        course = Course.objects.create(title="Curso sintético", owner=self.teacher)
        source = Session.objects.create(
            course=course,
            student=participant,
            created_by=self.teacher,
            started_at=started_at,
            ended_at=started_at + timedelta(minutes=2) if ended else None,
        )
        return TemporalSession.objects.create(
            participant=participant,
            course_session=source,
            started_at=started_at,
            ended_at=source.ended_at,
            provenance={"fixture": "synthetic"},
        )

    def create_state(self, temporal_session, state, *, offset, uncertainty=None):
        started_at = temporal_session.started_at + timedelta(seconds=offset)
        window = ObservationWindow.objects.create(
            temporal_session=temporal_session,
            started_at=started_at,
            ended_at=started_at + timedelta(seconds=5),
            aggregation_version="pr35-test-v1",
            features={},
            quality={"fixture": "synthetic"},
        )
        return InferredState.objects.create(
            window=window,
            state=state,
            probabilities={state: 1.0},
            uncertainty=uncertainty,
            inference_version="pr35-test-v1",
            inferred_at=window.ended_at,
        )

    @override_settings(STUDENT_ATTENTION_DASHBOARD=False)
    def test_feature_flag_fails_closed(self):
        response = self.client.get(reverse("student_evidence_dashboard"))
        self.assertEqual(response.status_code, 404)

    def test_only_students_can_access_dashboard(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get(reverse("student_evidence_dashboard"))
        self.assertEqual(response.status_code, 403)

    def test_empty_state_has_privacy_defaults_and_no_identifiers(self):
        response = self.client.get(reverse("student_evidence_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["state"], "empty")
        self.assertEqual(response.data["sessions"], [])
        self.assertFalse(response.data["privacy"]["capture_allowed"])
        self.assertFalse(response.data["privacy"]["images_stored"])
        self.assertFalse(response.data["privacy"]["teacher_access"])

    def test_aggregates_observable_uncertain_and_partial_windows(self):
        temporal = self.create_temporal_session(self.student)
        self.create_state(
            temporal, InferredState.STATE_TASK_ORIENTED_EVIDENCE, offset=0, uncertainty=0.2
        )
        self.create_state(
            temporal, InferredState.STATE_OFF_TASK_EVIDENCE, offset=5, uncertainty=0.6
        )
        self.create_state(temporal, InferredState.STATE_NO_OBSERVABLE, offset=10, uncertainty=0.0)
        self.create_state(temporal, InferredState.STATE_UNKNOWN, offset=15, uncertainty=0.9)

        response = self.client.get(reverse("student_evidence_dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["state"], "partial")
        session = response.data["sessions"][0]
        self.assertEqual(session["total_windows"], 4)
        self.assertEqual(session["observable_windows"], 2)
        self.assertEqual(session["no_observable_windows"], 1)
        self.assertEqual(session["unknown_windows"], 1)
        self.assertEqual(session["coverage"], 0.5)
        self.assertEqual(session["task_oriented_evidence_ratio"], 0.5)
        self.assertEqual(session["mean_uncertainty"], 0.4)

    def test_legacy_labels_and_missing_inference_are_reported_as_unknown(self):
        temporal = self.create_temporal_session(self.student)
        self.create_state(temporal, InferredState.STATE_ATTENTIVE, offset=0, uncertainty=0.1)
        start = temporal.started_at + timedelta(seconds=5)
        ObservationWindow.objects.create(
            temporal_session=temporal,
            started_at=start,
            ended_at=start + timedelta(seconds=5),
            aggregation_version="pr35-test-v1",
            features={},
        )

        response = self.client.get(reverse("student_evidence_dashboard"))

        session = response.data["sessions"][0]
        self.assertEqual(session["unknown_windows"], 2)
        self.assertIsNone(session["coverage"] if session["total_windows"] == 0 else session["mean_uncertainty"])
        self.assertNotIn("attentive", str(response.data))

    def test_response_is_scoped_to_authenticated_participant_and_minimized(self):
        own = self.create_temporal_session(self.student, minutes_ago=10)
        other = self.create_temporal_session(self.other_student, minutes_ago=4)
        self.create_state(own, InferredState.STATE_NO_OBSERVABLE, offset=0, uncertainty=0.0)
        self.create_state(other, InferredState.STATE_TASK_ORIENTED_EVIDENCE, offset=0, uncertainty=0.1)

        response = self.client.get(reverse("student_evidence_dashboard"))

        self.assertEqual(len(response.data["sessions"]), 1)
        serialized = str(response.data)
        self.assertNotIn(self.other_student.username, serialized)
        forbidden_keys = {"id", "participant", "course", "probabilities", "features", "model_reference"}

        def collect_keys(value):
            if isinstance(value, dict):
                return set(value) | set().union(*(collect_keys(item) for item in value.values()))
            if isinstance(value, list):
                return set().union(*(collect_keys(item) for item in value), set())
            return set()

        self.assertTrue(forbidden_keys.isdisjoint(collect_keys(response.data)))

    def test_revocation_is_reflected_by_dashboard_privacy_state(self):
        expires_at = timezone.now() + timedelta(days=1)
        for purpose in (
            ConsentEvent.PURPOSE_LOCAL_PROCESSING,
            ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
        ):
            ConsentEvent.objects.create(
                participant=self.student,
                version="pr35-test-v1",
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                expires_at=expires_at,
                source="test",
            )
        before = self.client.get(reverse("student_evidence_dashboard"))
        self.assertTrue(before.data["privacy"]["capture_allowed"])

        for purpose in (
            ConsentEvent.PURPOSE_LOCAL_PROCESSING,
            ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
        ):
            revoked = self.client.post(
                reverse("consent-list"),
                {
                    "version": "pr35-test-v1",
                    "purpose": purpose,
                    "action": ConsentEvent.ACTION_REVOKE,
                },
                format="json",
            )
            self.assertEqual(revoked.status_code, 201)

        after = self.client.get(reverse("student_evidence_dashboard"))
        self.assertFalse(after.data["privacy"]["capture_allowed"])
