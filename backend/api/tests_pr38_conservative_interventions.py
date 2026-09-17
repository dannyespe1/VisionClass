import uuid
from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    ConsentEvent,
    ContentView,
    Course,
    CourseLesson,
    CourseMaterial,
    CourseModule,
    Enrollment,
    InferredState,
    InterventionRecord,
    ObservationWindow,
    SecurityAuditEvent,
    Session,
    TemporalSession,
    User,
)


MODEL = "synthetic-observable-v1"


@override_settings(
    CONSERVATIVE_INTERVENTIONS=True,
    INTERVENTION_REQUIRED_WINDOWS=6,
    INTERVENTION_MAX_UNCERTAINTY=0.30,
    INTERVENTION_COOLDOWN_SECONDS=600,
    INTERVENTION_MAX_PER_SESSION=2,
    INTERVENTION_MAX_PER_DAY=4,
    INTERVENTION_MIN_SESSION_SECONDS=300,
    INTERVENTION_MAX_WINDOW_GAP_SECONDS=10,
    INTERVENTION_EVIDENCE_MAX_AGE_SECONDS=30,
    INTERVENTION_ALLOWED_MODEL_REFERENCES=(MODEL,),
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="intervention-test-v1",
    STRICT_EVENT_IDENTITY=True,
)
class ConservativeInterventionTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="pr38-student", password="test-only", role=User.ROLE_STUDENT
        )
        self.other = User.objects.create_user(
            username="pr38-other", password="test-only", role=User.ROLE_STUDENT
        )
        self.teacher = User.objects.create_user(
            username="pr38-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.course = Course.objects.create(title="Curso sintético PR38", owner=self.teacher)
        Enrollment.objects.create(user=self.student, course=self.course, status=Enrollment.STATUS_ACTIVE)
        self.module = CourseModule.objects.create(course=self.course, title="Módulo", order=1)
        self.lesson = CourseLesson.objects.create(module=self.module, title="Lección", order=1)
        self.material = CourseMaterial.objects.create(
            lesson=self.lesson,
            material_type=CourseMaterial.TYPE_VIDEO,
            title="Video sintético",
        )
        now = timezone.now()
        self.source = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=now - timedelta(minutes=10),
        )
        self.temporal = TemporalSession.objects.create(
            participant=self.student,
            course_session=self.source,
            started_at=self.source.started_at,
        )
        ContentView.objects.create(
            session=self.source,
            user=self.student,
            content_type=ContentView.TYPE_VIDEO,
            content_id=f"material:{self.material.id}",
        )
        self.grant_consent()
        self.client.force_authenticate(self.student)

    def grant_consent(self):
        for purpose in (
            ConsentEvent.PURPOSE_LOCAL_PROCESSING,
            ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
        ):
            ConsentEvent.objects.create(
                participant=self.student,
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                version="intervention-test-v1",
                expires_at=timezone.now() + timedelta(days=1),
            )

    def add_sequence(
        self,
        states=None,
        *,
        uncertainty=0.2,
        observable=True,
        gap_seconds=1,
        profile="balanced",
        generation=1,
        model=MODEL,
    ):
        states = states or [InferredState.STATE_OFF_TASK_EVIDENCE] * 6
        end = timezone.now() - timedelta(seconds=1)
        start = end - timedelta(seconds=((len(states) - 1) * (5 + gap_seconds) + 5))
        created = []
        for index, state in enumerate(states):
            window_start = start + timedelta(seconds=index * (5 + gap_seconds))
            window = ObservationWindow.objects.create(
                temporal_session=self.temporal,
                started_at=window_start,
                ended_at=window_start + timedelta(seconds=5),
                aggregation_version="pr38-window-v1",
                features={"synthetic": True},
                quality={"observable": observable},
                provenance={
                    "execution_profile": profile,
                    "profile_generation": generation,
                    "fixture": "synthetic",
                },
            )
            created.append(
                InferredState.objects.create(
                    inference_id=uuid.uuid4(),
                    window=window,
                    state=state,
                    probabilities={state: 0.9},
                    uncertainty=uncertainty,
                    quality={"observable": observable},
                    model_reference=model,
                    inference_version="inference-v1",
                    inferred_at=window.ended_at,
                    provenance={"interpretation": "observable_evidence_not_internal_attention"},
                )
            )
        return created

    def evaluate(self, session=None):
        return self.client.post(
            reverse("conservative_intervention"),
            {"session_id": (session or self.source).id},
            format="json",
        )

    @override_settings(CONSERVATIVE_INTERVENTIONS=False)
    def test_global_flag_fails_closed_without_record(self):
        self.add_sequence()
        self.assertEqual(self.evaluate().status_code, 404)
        self.assertFalse(InterventionRecord.objects.exists())

    def test_six_observable_low_uncertainty_windows_present_optional_suggestion(self):
        self.add_sequence()
        response = self.evaluate()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["state"], "presented")
        self.assertTrue(response.data["optional"])
        self.assertFalse(response.data["teacher_notified"])
        self.assertFalse(response.data["academic_decision"])
        self.assertIn("no es una medición", response.data["explanation"])
        record = InterventionRecord.objects.get()
        self.assertEqual(record.policy_version, "conservative-interventions-v1")
        self.assertEqual(record.provenance["window_count"], 6)
        self.assertEqual(record.provenance["model_reference"], MODEL)
        self.assertFalse(record.provenance["llm_used"])
        self.assertNotIn("features", str(response.data))
        self.assertTrue(
            SecurityAuditEvent.objects.filter(
                action="intervention_evaluate", outcome="allowed"
            ).exists()
        )

    def test_isolated_noise_unknown_and_no_observable_never_trigger(self):
        scenarios = [
            [InferredState.STATE_OFF_TASK_EVIDENCE] * 5,
            [InferredState.STATE_OFF_TASK_EVIDENCE] * 5 + [InferredState.STATE_TASK_ORIENTED_EVIDENCE],
            [InferredState.STATE_OFF_TASK_EVIDENCE] * 5 + [InferredState.STATE_UNKNOWN],
            [InferredState.STATE_OFF_TASK_EVIDENCE] * 5 + [InferredState.STATE_NO_OBSERVABLE],
        ]
        for index, states in enumerate(scenarios):
            InferredState.objects.all().delete()
            ObservationWindow.objects.all().delete()
            self.add_sequence(states)
            response = self.evaluate()
            self.assertEqual(response.data["state"], "suppressed", index)
        self.assertFalse(InterventionRecord.objects.exists())

    def test_high_uncertainty_gap_and_profile_change_are_suppressed(self):
        self.add_sequence(uncertainty=0.31)
        self.assertEqual(self.evaluate().data["reason_code"], "uncertainty_too_high")
        InferredState.objects.all().delete()
        ObservationWindow.objects.all().delete()
        self.add_sequence(gap_seconds=11)
        self.assertEqual(self.evaluate().data["reason_code"], "window_gap_exceeded")
        InferredState.objects.all().delete()
        ObservationWindow.objects.all().delete()
        sequence = self.add_sequence()
        window = sequence[-1].window
        window.provenance["profile_generation"] = 2
        window.save(update_fields=["provenance"])
        self.assertEqual(self.evaluate().data["reason_code"], "profile_changed_or_unverified")

    def test_warmup_stale_or_non_observable_camera_evidence_is_suppressed(self):
        self.source.started_at = timezone.now() - timedelta(minutes=1)
        self.source.save(update_fields=["started_at"])
        self.add_sequence()
        self.assertEqual(self.evaluate().data["reason_code"], "session_warmup")
        self.source.started_at = timezone.now() - timedelta(minutes=10)
        self.source.save(update_fields=["started_at"])
        InferredState.objects.all().delete()
        ObservationWindow.objects.all().delete()
        self.add_sequence(observable=False)
        self.assertEqual(self.evaluate().data["reason_code"], "signal_not_explicitly_observable")
        ObservationWindow.objects.update(
            started_at=timezone.now() - timedelta(minutes=3),
            ended_at=timezone.now() - timedelta(minutes=2),
        )
        self.assertEqual(self.evaluate().data["reason_code"], "stale_evidence")

    @override_settings(INTERVENTION_ALLOWED_MODEL_REFERENCES=())
    def test_empty_model_allowlist_fails_closed(self):
        self.add_sequence()
        self.assertEqual(self.evaluate().data["reason_code"], "model_allowlist_empty")
        self.assertFalse(InterventionRecord.objects.exists())

    def test_assessment_and_unverified_context_are_excluded_server_side(self):
        self.add_sequence()
        current = ContentView.objects.get()
        current.ended_at = timezone.now()
        current.save(update_fields=["ended_at"])
        self.assertEqual(self.evaluate().data["reason_code"], "learning_context_unverified")
        test_material = CourseMaterial.objects.create(
            lesson=self.lesson,
            material_type=CourseMaterial.TYPE_TEST,
            title="Evaluación sintética",
        )
        ContentView.objects.create(
            session=self.source,
            user=self.student,
            content_type=ContentView.TYPE_QUIZ,
            content_id=f"material:{test_material.id}",
        )
        self.assertEqual(self.evaluate().data["reason_code"], "assessment_excluded")

    def test_revoked_consent_stops_intervention_immediately(self):
        self.add_sequence()
        ConsentEvent.objects.create(
            participant=self.student,
            purpose=ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
            action=ConsentEvent.ACTION_REVOKE,
            version="intervention-test-v1",
        )
        response = self.evaluate()
        self.assertEqual(response.data["reason_code"], "consent_not_valid")
        self.assertFalse(InterventionRecord.objects.exists())

    def test_model_must_be_explicitly_allowlisted(self):
        self.add_sequence(model="unapproved-model")
        response = self.evaluate()
        self.assertEqual(response.data["reason_code"], "model_not_allowlisted")
        self.assertFalse(InterventionRecord.objects.exists())

    def test_duplicate_evidence_cooldown_and_session_limit_are_enforced(self):
        self.add_sequence()
        self.assertEqual(self.evaluate().data["state"], "presented")
        self.assertEqual(self.evaluate().data["reason_code"], "evidence_already_evaluated")
        for window in ObservationWindow.objects.all():
            window.started_at -= timedelta(minutes=1)
            window.ended_at -= timedelta(minutes=1)
            window.save(update_fields=["started_at", "ended_at"])
        for inference in InferredState.objects.all():
            inference.inferred_at -= timedelta(minutes=1)
            inference.save(update_fields=["inferred_at"])
        self.add_sequence()
        self.assertEqual(self.evaluate().data["reason_code"], "cooldown_active")
        first = InterventionRecord.objects.get()
        first.occurred_at = timezone.now() - timedelta(minutes=11)
        first.save(update_fields=["occurred_at"])
        self.assertEqual(self.evaluate().data["state"], "presented")
        second = InterventionRecord.objects.order_by("-id").first()
        second.occurred_at = timezone.now() - timedelta(minutes=11)
        second.save(update_fields=["occurred_at"])
        for window in ObservationWindow.objects.all():
            window.started_at -= timedelta(minutes=1)
            window.ended_at -= timedelta(minutes=1)
            window.save(update_fields=["started_at", "ended_at"])
        for inference in InferredState.objects.all():
            inference.inferred_at -= timedelta(minutes=1)
            inference.save(update_fields=["inferred_at"])
        self.add_sequence()
        response = self.evaluate()
        self.assertEqual(response.data["reason_code"], "session_frequency_limit")
        self.assertEqual(InterventionRecord.objects.count(), 2)

    def test_daily_limit_counts_other_sessions_for_same_student(self):
        for index in range(4):
            other_course = Course.objects.create(title=f"Curso diario {index}", owner=self.teacher)
            other_source = Session.objects.create(
                course=other_course,
                student=self.student,
                created_by=self.student,
                started_at=timezone.now() - timedelta(hours=1),
            )
            other_temporal = TemporalSession.objects.create(
                participant=self.student,
                course_session=other_source,
                started_at=other_source.started_at,
            )
            InterventionRecord.objects.create(
                temporal_session=other_temporal,
                intervention_type="general_optional_refocus",
                status=InterventionRecord.STATUS_PRESENTED,
                occurred_at=timezone.now() - timedelta(minutes=index + 1),
                policy_version="conservative-interventions-v1",
                provenance={"fixture": "synthetic"},
            )
        self.add_sequence()
        response = self.evaluate()
        self.assertEqual(response.data["reason_code"], "daily_frequency_limit")
        self.assertEqual(InterventionRecord.objects.count(), 4)

    def test_other_user_and_teacher_cannot_evaluate_student_session(self):
        self.add_sequence()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.evaluate().status_code, 403)
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.evaluate().status_code, 403)
        self.assertFalse(InterventionRecord.objects.exists())
