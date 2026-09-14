from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    AttentionEvent,
    ConsentEvent,
    Course,
    D2RResult,
    D2RSession,
    Enrollment,
    SecurityAuditEvent,
    Session,
    User,
)


@override_settings(
    STRICT_EVENT_IDENTITY=True,
    EVENT_SESSION_MAX_AGE_MINUTES=480,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="test-v1",
)
class StrictEventIdentityTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="student-a", role=User.ROLE_STUDENT)
        self.other_student = User.objects.create_user(username="student-b", role=User.ROLE_STUDENT)
        self.teacher = User.objects.create_user(username="teacher-a", role=User.ROLE_TEACHER)
        self.admin = User.objects.create_user(username="admin-a", role=User.ROLE_ADMIN, is_staff=True)
        self.course = Course.objects.create(title="Course A", owner=self.teacher)
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
        self.client.force_authenticate(self.student)

    def event_payload(self, session=None, user_id=None):
        return {
            "session_id": (session or self.session).id,
            "user_id": user_id if user_id is not None else self.student.id,
            "timestamp": timezone.now().isoformat(),
            "value": 0.75,
            "label": "observable",
            "data": {},
        }

    def test_rejects_discordant_user_id_and_audits_without_payload(self):
        response = self.client.post(
            "/api/attention-events/",
            self.event_payload(user_id=self.other_student.id),
            format="json",
            HTTP_IDEMPOTENCY_KEY="evt:discordant:0001",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        audit = SecurityAuditEvent.objects.get()
        self.assertEqual(audit.reason_code, "claimed_user_mismatch")
        self.assertFalse(hasattr(audit, "payload"))
        self.assertEqual(AttentionEvent.objects.count(), 0)

    def test_rejects_another_students_session(self):
        foreign_session = Session.objects.create(
            course=self.course,
            student=self.other_student,
            created_by=self.other_student,
            started_at=timezone.now(),
        )

        response = self.client.post(
            "/api/attention-events/",
            self.event_payload(session=foreign_session),
            format="json",
            HTTP_IDEMPOTENCY_KEY="evt:foreign:000001",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(SecurityAuditEvent.objects.latest("id").reason_code, "session_owner_mismatch")

    def test_rejects_expired_session(self):
        self.session.started_at = timezone.now() - timedelta(hours=9)
        self.session.save(update_fields=["started_at"])

        response = self.client.post(
            "/api/attention-events/",
            self.event_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY="evt:expired:000001",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(SecurityAuditEvent.objects.latest("id").reason_code, "session_expired")

    def test_rejects_teacher_and_admin_event_writes(self):
        for actor in (self.teacher, self.admin):
            self.client.force_authenticate(actor)
            response = self.client.post(
                "/api/attention-events/",
                self.event_payload(user_id=actor.id),
                format="json",
                HTTP_IDEMPOTENCY_KEY=f"evt:role:{actor.id:08d}",
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.assertEqual(AttentionEvent.objects.count(), 0)

    def test_replay_is_rejected_and_aggregate_updates_once(self):
        headers = {"HTTP_IDEMPOTENCY_KEY": "evt:replay:000001"}
        first = self.client.post("/api/attention-events/", self.event_payload(), format="json", **headers)
        second = self.client.post("/api/attention-events/", self.event_payload(), format="json", **headers)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(AttentionEvent.objects.count(), 1)
        self.session.refresh_from_db()
        self.assertEqual(self.session.frame_count, 1)

    def test_prediction_rejects_foreign_and_expired_sessions(self):
        foreign_session = Session.objects.create(
            course=self.course,
            student=self.other_student,
            created_by=self.other_student,
            started_at=timezone.now(),
        )
        foreign = self.client.post("/api/recommendations/difficulty/", {"session_id": foreign_session.id})
        self.assertEqual(foreign.status_code, status.HTTP_403_FORBIDDEN)

        self.session.ended_at = timezone.now()
        self.session.save(update_fields=["ended_at"])
        expired = self.client.post("/api/recommendations/difficulty/", {"session_id": self.session.id})
        self.assertEqual(expired.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(STRICT_EVENT_IDENTITY=False)
    def test_disabling_strict_mode_fails_closed(self):
        response = self.client.post(
            "/api/attention-events/",
            self.event_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY="evt:disabled:00001",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(SecurityAuditEvent.objects.latest("id").reason_code, "strict_identity_disabled")
class D2RTransitionTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student-pr02",
            role=User.ROLE_STUDENT,
        )
        self.session = D2RSession.objects.create(user=self.student)
        self.result = D2RResult.objects.create(
            d2r_session=self.session,
            user=self.student,
            raw_score=10,
            processing_speed=1.0,
            attention_span=8.0,
            errors=2,
        )
        self.client.force_authenticate(self.student)

    @override_settings(D2R_ENABLED=False)
    def test_historical_results_remain_readable_when_disabled(self):
        response = self.client.get("/api/d2r-results/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.result.id)

    @override_settings(D2R_ENABLED=False)
    def test_new_d2r_writes_are_blocked_when_disabled(self):
        response = self.client.post("/api/d2r-sessions/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(D2RSession.objects.filter(user=self.student).count(), 1)

    @override_settings(D2R_ENABLED=True)
    def test_flag_restores_legacy_session_creation(self):
        response = self.client.post("/api/d2r-sessions/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(D2RSession.objects.filter(user=self.student).count(), 2)

    @override_settings(D2R_ENABLED=False)
    def test_student_metrics_do_not_expose_d2r_analysis_when_disabled(self):
        response = self.client.get("/api/student-metrics/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["d2r_analysis"]["current_score"], 0)
        self.assertEqual(response.data["d2r_analysis"]["last_test_date"], "")
