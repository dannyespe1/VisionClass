import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    ConsentEvent,
    Course,
    Enrollment,
    ObservationWindow,
    ObserverAnnotation,
    ObserverAssignment,
    ResearchAccessRequest,
    Session,
    TemporalSession,
    User,
)


class ObserverAnnotationTests(TestCase):
    def setUp(self):
        self.participant = User.objects.create_user(username="participant", password="test-only")
        self.observer_a = User.objects.create_user(username="observer-a", password="test-only")
        self.observer_b = User.objects.create_user(username="observer-b", password="test-only")
        course = Course.objects.create(title="PR31", owner=self.participant)
        source = Session.objects.create(course=course, student=self.participant, created_by=self.participant, started_at=timezone.now())
        temporal = TemporalSession.objects.create(participant=self.participant, course_session=source, started_at=source.started_at)
        self.window = ObservationWindow.objects.create(temporal_session=temporal, started_at=timezone.now(), ended_at=timezone.now() + timedelta(seconds=5), aggregation_version="window-v1", features={})

    def assignment(self, observer):
        return ObserverAssignment.objects.create(assignment_id=uuid.uuid4(), window=self.window, observer=observer, manual_version="manual-v1", sample_stratum="random-v1")

    def test_two_independent_observers_can_annotate_same_window(self):
        for observer in (self.observer_a, self.observer_b):
            assignment = self.assignment(observer)
            ObserverAnnotation.objects.create(assignment=assignment, category="uncertain", confidence=0.5, completed_at=timezone.now())
        self.assertEqual(self.window.observer_assignments.count(), 2)

    def test_same_observer_cannot_receive_window_twice(self):
        self.assignment(self.observer_a)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.assignment(self.observer_a)

    def test_participant_cannot_observe_own_window(self):
        assignment = ObserverAssignment(assignment_id=uuid.uuid4(), window=self.window, observer=self.participant, manual_version="manual-v1", sample_stratum="random-v1")
        with self.assertRaises(ValidationError):
            assignment.full_clean()

    def test_assignment_exposes_no_model_prediction_field(self):
        fields = {field.name for field in ObserverAssignment._meta.fields}
        self.assertFalse(fields & {"prediction", "inferred_state", "model_score"})

    def test_no_observable_requires_a_protocol_reason(self):
        assignment = self.assignment(self.observer_a)
        annotation = ObserverAnnotation(
            assignment=assignment,
            category="no_observable",
            confidence=1,
            notes_code="",
            completed_at=timezone.now(),
        )
        with self.assertRaises(ValidationError):
            annotation.full_clean()
        annotation.notes_code = "iluminacion"
        annotation.full_clean()

    def test_database_rejects_no_observable_without_reason(self):
        assignment = self.assignment(self.observer_a)
        with self.assertRaises(IntegrityError), transaction.atomic():
            ObserverAnnotation.objects.create(
                assignment=assignment,
                category="no_observable",
                confidence=1,
                notes_code="",
                completed_at=timezone.now(),
            )

    def test_annotation_is_immutable(self):
        annotation = ObserverAnnotation.objects.create(
            assignment=self.assignment(self.observer_a),
            category="uncertain",
            confidence=0.5,
            completed_at=timezone.now(),
        )
        annotation.category = "attentive"
        with self.assertRaises(ValidationError):
            annotation.save()


@override_settings(
    OBSERVER_ANNOTATION=True,
    OBSERVER_ANNOTATION_SCHEDULE_LEAD_SECONDS=5,
    OBSERVER_ANNOTATION_WINDOW_SECONDS=5,
    OBSERVER_ANNOTATION_SUBMISSION_GRACE_SECONDS=180,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="observer-test-v1",
)
class ObserverWorkflowAPITests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username="teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.reviewer = User.objects.create_user(
            username="reviewer", password="test-only", role=User.ROLE_RESEARCHER
        )
        self.outsider = User.objects.create_user(
            username="outsider", password="test-only", role=User.ROLE_RESEARCHER
        )
        self.participant = User.objects.create_user(
            username="participant-live", password="test-only", role=User.ROLE_STUDENT
        )
        self.course = Course.objects.create(title="PR31 live", owner=self.teacher)
        Enrollment.objects.create(user=self.participant, course=self.course, status=Enrollment.STATUS_ACTIVE)
        source = Session.objects.create(
            course=self.course,
            student=self.participant,
            created_by=self.participant,
            started_at=timezone.now(),
        )
        self.temporal = TemporalSession.objects.create(
            participant=self.participant,
            course_session=source,
            started_at=source.started_at,
        )
        expires = timezone.now() + timedelta(days=1)
        for purpose, _ in ConsentEvent.PURPOSE_CHOICES:
            ConsentEvent.objects.create(
                participant=self.participant,
                version="observer-test-v1",
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                expires_at=expires,
                source="test",
            )
        ResearchAccessRequest.objects.create(
            researcher="Reviewer",
            institution="Test",
            project="Blind annotation",
            status=ResearchAccessRequest.STATUS_APPROVED,
            ethics_approval=True,
            principal=self.reviewer,
            purpose="Independent observable-orientation annotation",
            expires_at=expires,
            cohort_scope=[f"course:{self.course.id}"],
        )
        self.client = APIClient()

    def schedule(self, request_id=None):
        self.client.force_authenticate(self.teacher)
        return self.client.post(
            reverse("observer-schedules"),
            {
                "course_id": self.course.id,
                "participant_id": self.participant.id,
                "reviewer_id": self.reviewer.id,
                "request_id": str(request_id or uuid.uuid4()),
            },
            format="json",
        )

    def make_window_submittable(self):
        window = ObservationWindow.objects.get(aggregation_version="observer-slot-v2")
        window.started_at = timezone.now() - timedelta(seconds=6)
        window.ended_at = timezone.now() - timedelta(seconds=1)
        window.save(update_fields=["started_at", "ended_at"])

    def test_schedule_is_idempotent_paired_and_contains_no_identity_or_prediction(self):
        request_id = uuid.uuid4()
        created = self.schedule(request_id)
        replay = self.schedule(request_id)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(created.data["assignment_id"], replay.data["assignment_id"])
        window = ObservationWindow.objects.get(aggregation_version="observer-slot-v2")
        self.assertEqual(window.observer_assignments.count(), 2)
        self.assertEqual((window.ended_at - window.started_at).total_seconds(), 5)
        exposed = str(created.data).lower()
        for forbidden in ("email", "username", "participant_id", "prediction", "score", "features"):
            self.assertNotIn(forbidden, exposed)

    def test_each_observer_only_lists_and_submits_their_assignment(self):
        self.schedule()
        self.make_window_submittable()
        teacher_assignment = ObserverAssignment.objects.get(observer=self.teacher)
        reviewer_assignment = ObserverAssignment.objects.get(observer=self.reviewer)

        self.client.force_authenticate(self.teacher)
        teacher_list = self.client.get(reverse("observer-assignments"))
        self.assertEqual(teacher_list.status_code, 200)
        self.assertEqual(len(teacher_list.data["assignments"]), 1)
        self.assertEqual(teacher_list.data["assignments"][0]["assignment_id"], str(teacher_assignment.assignment_id))

        first = self.client.post(
            reverse("observer-assignments"),
            {"assignment_id": str(teacher_assignment.assignment_id), "category": "attentive", "confidence": 0.75},
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["pair_status"], "waiting_for_peer")

        self.client.force_authenticate(self.reviewer)
        second = self.client.post(
            reverse("observer-assignments"),
            {"assignment_id": str(reviewer_assignment.assignment_id), "category": "distracted", "confidence": 0.75},
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data["pair_status"], "complete")
        self.assertNotIn("agreement", second.data)
        self.assertNotIn("peer_category", second.data)

    def test_submission_is_blocked_until_the_five_second_window_finishes(self):
        self.schedule()
        assignment = ObserverAssignment.objects.get(observer=self.teacher)
        window = assignment.window
        window.started_at = timezone.now() - timedelta(seconds=1)
        window.ended_at = timezone.now() + timedelta(seconds=4)
        window.save(update_fields=["started_at", "ended_at"])
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            reverse("observer-assignments"),
            {"assignment_id": str(assignment.assignment_id), "category": "uncertain", "confidence": 0.5},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertFalse(ObserverAnnotation.objects.filter(assignment=assignment).exists())

    def test_unassigned_reviewer_and_invalid_no_observable_fail_closed(self):
        self.schedule()
        self.make_window_submittable()
        teacher_assignment = ObserverAssignment.objects.get(observer=self.teacher)
        self.client.force_authenticate(self.outsider)
        denied = self.client.post(
            reverse("observer-assignments"),
            {"assignment_id": str(teacher_assignment.assignment_id), "category": "uncertain", "confidence": 0.5},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.teacher)
        invalid = self.client.post(
            reverse("observer-assignments"),
            {"assignment_id": str(teacher_assignment.assignment_id), "category": "no_observable", "confidence": 1},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

    def test_revoked_research_consent_blocks_submission(self):
        self.schedule()
        self.make_window_submittable()
        assignment = ObserverAssignment.objects.get(observer=self.teacher)
        ConsentEvent.objects.create(
            participant=self.participant,
            version="observer-test-v1",
            purpose=ConsentEvent.PURPOSE_RESEARCH,
            action=ConsentEvent.ACTION_REVOKE,
            source="test",
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            reverse("observer-assignments"),
            {"assignment_id": str(assignment.assignment_id), "category": "uncertain", "confidence": 0.5},
            format="json",
        )
        self.assertEqual(response.status_code, 409)

    def test_reviewer_grant_must_cover_the_course(self):
        grant = ResearchAccessRequest.objects.get(principal=self.reviewer)
        grant.cohort_scope = ["course:999999"]
        grant.save(update_fields=["cohort_scope"])
        response = self.schedule()
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ObservationWindow.objects.filter(aggregation_version="observer-slot-v2").exists())

    @override_settings(OBSERVER_ANNOTATION=False)
    def test_feature_flag_hides_observer_endpoints(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get(reverse("observer-assignments"))
        self.assertEqual(response.status_code, 404)
