import uuid
from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone

from .models import Course, LearningInteractionEvent, Session, TemporalSession, User
from .retention import delete_participant_derived


class FakeRedis:
    def __init__(self): self.messages = []
    def xadd(self, stream, values, **_kwargs): self.messages.append((stream, values))


@override_settings(RETENTION_AUDIT_SECRET="r" * 32, REDIS_NAMESPACE="visionclass:test")
class RetentionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="synthetic-retention", password="test-only")
        course = Course.objects.create(title="Synthetic", owner=self.user)
        source = Session.objects.create(course=course, student=self.user, created_by=self.user, started_at=timezone.now())
        self.temporal = TemporalSession.objects.create(participant=self.user, course_session=source, started_at=source.started_at)
        LearningInteractionEvent.objects.create(event_id=uuid.uuid4(), temporal_session=self.temporal, event_type="pause", resource_kind="video", resource_reference="opaque", occurred_at=timezone.now() - timedelta(days=1), consent_version="test-v1")

    def test_dry_run_preserves_data_and_contains_no_identifier(self):
        run = delete_participant_derived(self.user, execute=False)
        self.assertEqual(run.counts["learning_events"], 1)
        self.assertEqual(LearningInteractionEvent.objects.count(), 1)
        self.assertEqual(len(run.subject_digest), 64)
        self.assertNotEqual(run.subject_digest, str(self.user.pk))

    def test_execute_covers_database_and_emits_redis_tombstone(self):
        redis = FakeRedis()
        run = delete_participant_derived(self.user, redis_client=redis, execute=True)
        self.assertEqual(run.status, "completed")
        self.assertEqual(LearningInteractionEvent.objects.count(), 0)
        self.assertEqual(TemporalSession.objects.count(), 0)
        self.assertEqual(redis.messages[0][1]["action"], "delete")

    def test_retry_is_idempotent(self):
        delete_participant_derived(self.user, execute=True)
        second = delete_participant_derived(self.user, execute=True)
        self.assertTrue(all(value == 0 for value in second.counts.values()))
