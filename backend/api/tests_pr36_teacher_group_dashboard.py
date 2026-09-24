import uuid
from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Course,
    CourseLesson,
    CourseMaterial,
    CourseModule,
    Enrollment,
    InferredState,
    LearningInteractionEvent,
    ObservationWindow,
    QuizAttempt,
    Session,
    TemporalSession,
    User,
)


@override_settings(
    TEACHER_GROUP_DASHBOARD=True,
    TEACHER_GROUP_DASHBOARD_MIN_PARTICIPANTS=20,
    TEACHER_GROUP_DASHBOARD_MIN_OBSERVABLE_WINDOWS=100,
)
class TeacherGroupDashboardTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username="pr36-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.other_teacher = User.objects.create_user(
            username="pr36-other-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.student = User.objects.create_user(
            username="pr36-student", password="test-only", role=User.ROLE_STUDENT
        )
        self.course = Course.objects.create(title="Curso agregado", owner=self.teacher)
        self.other_course = Course.objects.create(title="Curso ajeno", owner=self.other_teacher)
        self.client.force_authenticate(self.teacher)

    def add_participant(
        self,
        course,
        index,
        *,
        windows=5,
        days_ago=1,
        resource_reference="opaque:activity:shared",
    ):
        participant = User.objects.create_user(
            username=f"fixture-{course.id}-{index}-{uuid.uuid4().hex[:6]}",
            password="test-only",
            role=User.ROLE_STUDENT,
        )
        occurred_at = timezone.now() - timedelta(days=days_ago)
        source = Session.objects.create(
            course=course,
            student=participant,
            created_by=course.owner,
            started_at=occurred_at,
            ended_at=occurred_at + timedelta(minutes=5),
        )
        temporal = TemporalSession.objects.create(
            participant=participant,
            course_session=source,
            started_at=source.started_at,
            ended_at=source.ended_at,
            provenance={"fixture": "synthetic"},
        )
        for window_index in range(windows):
            started_at = occurred_at + timedelta(seconds=window_index * 6)
            window = ObservationWindow.objects.create(
                temporal_session=temporal,
                started_at=started_at,
                ended_at=started_at + timedelta(seconds=5),
                aggregation_version="pr36-test-v1",
                features={},
                quality={"fixture": "synthetic"},
            )
            state = (
                InferredState.STATE_TASK_ORIENTED_EVIDENCE
                if window_index % 5 < 3
                else InferredState.STATE_OFF_TASK_EVIDENCE
            )
            uncertainty = 0.2 if state == InferredState.STATE_TASK_ORIENTED_EVIDENCE else 0.4
            InferredState.objects.create(
                window=window,
                state=state,
                probabilities={state: 1.0},
                uncertainty=uncertainty,
                inference_version="pr36-test-v1",
                inferred_at=window.ended_at,
            )
            LearningInteractionEvent.objects.create(
                event_id=uuid.uuid4(),
                temporal_session=temporal,
                window=window,
                event_type=LearningInteractionEvent.TYPE_ACTIVITY,
                resource_kind="activity",
                resource_reference=resource_reference,
                occurred_at=started_at,
                metadata={"fixture": "synthetic"},
                consent_version="pr36-test-v1",
            )
        return participant

    @override_settings(TEACHER_GROUP_DASHBOARD=False)
    def test_feature_flag_fails_closed(self):
        response = self.client.get(reverse("teacher_group_dashboard"))
        self.assertEqual(response.status_code, 404)

    def test_only_teacher_role_can_access(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(reverse("teacher_group_dashboard"))
        self.assertEqual(response.status_code, 403)

    def test_empty_state_lists_only_owned_courses(self):
        response = self.client.get(reverse("teacher_group_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["state"], "empty")
        self.assertEqual(response.data["courses"], [{"id": self.course.id, "title": self.course.title}])
        self.assertFalse(response.data["privacy"]["individual_states_available"])

    def test_academic_results_include_owned_course_quiz_summary(self):
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.STATUS_COMPLETED,
        )
        module = CourseModule.objects.create(course=self.course, title="Módulo", order=1)
        lesson = CourseLesson.objects.create(module=module, title="Lección", order=1)
        CourseMaterial.objects.create(
            lesson=lesson,
            material_type=CourseMaterial.TYPE_TEST,
            title="Evaluación",
            metadata={"passing_score": 70},
        )
        first_session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.teacher,
        )
        second_session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.teacher,
        )
        QuizAttempt.objects.create(session=first_session, user=self.student, score=17)
        latest_attempt = QuizAttempt.objects.create(
            session=second_session,
            user=self.student,
            score=67,
        )

        response = self.client.get(
            reverse("teacher_group_dashboard"),
            {"course_id": self.course.id, "period": "90d"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["state"], "empty")
        result = response.data["academic_results"][0]
        self.assertEqual(result["course_id"], self.course.id)
        self.assertEqual(result["enrollment_count"], 1)
        self.assertEqual(result["completed_enrollment_count"], 1)
        self.assertEqual(result["attempt_count"], 2)
        self.assertEqual(result["average_score"], 42.0)
        self.assertEqual(result["latest_score"], 67.0)
        self.assertEqual(result["passing_score"], 70.0)
        self.assertEqual(result["pass_rate"], 0.0)
        self.assertEqual(result["latest_attempt_at"], latest_attempt.created_at.isoformat())

    def test_small_group_is_suppressed_without_exact_count_or_reference(self):
        for index in range(19):
            self.add_participant(self.course, index, windows=1)

        response = self.client.get(reverse("teacher_group_dashboard"), {"period": "all"})

        activity = response.data["activities"][0]
        self.assertEqual(activity["status"], "suppressed")
        self.assertEqual(activity["reason_code"], "minimum_participants")
        self.assertNotIn("participant_band", activity)
        self.assertNotIn("participant_count", activity)
        self.assertNotIn("total_windows", activity)
        self.assertNotIn("resource_reference", str(response.data))

    def test_publishes_distribution_coverage_uncertainty_and_interval(self):
        for index in range(20):
            self.add_participant(self.course, index)

        response = self.client.get(
            reverse("teacher_group_dashboard"),
            {"course_id": self.course.id, "period": "90d"},
        )

        self.assertEqual(response.status_code, 200)
        activity = response.data["activities"][0]
        self.assertEqual(activity["status"], "published")
        self.assertEqual(activity["participant_band"], "20-39")
        self.assertEqual(activity["total_windows"], 100)
        self.assertEqual(activity["observable_windows"], 100)
        self.assertEqual(activity["coverage"], 1.0)
        self.assertEqual(activity["mean_uncertainty"], 0.28)
        self.assertEqual(activity["distribution"]["task_oriented_evidence_ratio"], 0.6)
        self.assertEqual(activity["task_oriented_interval_95"]["lower"], 0.6)
        self.assertEqual(activity["task_oriented_interval_95"]["upper"], 0.6)
        self.assertEqual(activity["trend"][0]["status"], "published")

    def test_combined_period_filter_applies_complementary_suppression(self):
        for index in range(20):
            self.add_participant(self.course, index, days_ago=1)
        for index in range(5):
            self.add_participant(self.course, 100 + index, windows=1, days_ago=120)

        filtered = self.client.get(
            reverse("teacher_group_dashboard"),
            {"course_id": self.course.id, "period": "90d"},
        )
        complete = self.client.get(
            reverse("teacher_group_dashboard"),
            {"course_id": self.course.id, "period": "all"},
        )

        self.assertEqual(filtered.data["activities"][0]["status"], "suppressed")
        self.assertEqual(
            filtered.data["activities"][0]["reason_code"],
            "complementary_period_suppression",
        )
        self.assertEqual(complete.data["activities"][0]["status"], "published")

    def test_missing_uncertainty_suppresses_incomplete_metric(self):
        for index in range(20):
            self.add_participant(self.course, index)
        state = InferredState.objects.first()
        state.uncertainty = None
        state.save(update_fields=["uncertainty"])

        response = self.client.get(reverse("teacher_group_dashboard"), {"period": "all"})

        activity = response.data["activities"][0]
        self.assertEqual(activity["status"], "suppressed")
        self.assertEqual(activity["reason_code"], "missing_uncertainty")

    def test_rejects_invalid_or_unowned_course_filters(self):
        invalid = self.client.get(reverse("teacher_group_dashboard"), {"period": "7d"})
        malformed = self.client.get(reverse("teacher_group_dashboard"), {"course_id": "student-name"})
        unowned = self.client.get(
            reverse("teacher_group_dashboard"), {"course_id": self.other_course.id}
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(malformed.status_code, 400)
        self.assertEqual(unowned.status_code, 404)

    def test_response_never_contains_individual_or_model_payloads(self):
        for index in range(20):
            self.add_participant(self.course, index)
        self.add_participant(self.other_course, 999, resource_reference="opaque:other:secret")

        response = self.client.get(reverse("teacher_group_dashboard"), {"period": "all"})
        serialized = str(response.data)
        self.assertNotIn(self.other_course.title, serialized)
        self.assertNotIn("opaque:other:secret", serialized)
        forbidden_keys = {
            "participant",
            "student",
            "user",
            "resource_reference",
            "probabilities",
            "features",
            "model_reference",
        }

        def collect_keys(value):
            if isinstance(value, dict):
                nested = [collect_keys(item) for item in value.values()]
                return set(value).union(*nested) if nested else set(value)
            if isinstance(value, list):
                nested = [collect_keys(item) for item in value]
                return set().union(*nested) if nested else set()
            return set()

        self.assertTrue(forbidden_keys.isdisjoint(collect_keys(response.data)))
