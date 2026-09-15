import uuid

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from .models import Course, LearningInteractionEvent, Session, TemporalSession, User


class LearningInteractionEventTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pr30", password="test-only")
        course = Course.objects.create(title="PR30", owner=self.user)
        source = Session.objects.create(course=course, student=self.user, created_by=self.user, started_at=timezone.now())
        self.temporal = TemporalSession.objects.create(participant=self.user, course_session=source, started_at=source.started_at)

    def payload(self, event_id=None):
        return dict(event_id=event_id or uuid.uuid4(), temporal_session=self.temporal, event_type="pause", resource_kind="video", resource_reference="opaque:lesson:42", occurred_at=timezone.now(), metadata={"position_bucket": 3}, consent_version="pending-review-v1")

    def test_activity_remains_separate_from_inference(self):
        event = LearningInteractionEvent.objects.create(**self.payload())
        self.assertFalse(hasattr(event, "attention_state"))

    def test_rejects_academic_content_and_answers(self):
        event = LearningInteractionEvent(**self.payload())
        event.metadata = {"answer": "sensitive-content"}
        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_duplicate_event_id_is_rejected(self):
        event_id = uuid.uuid4()
        LearningInteractionEvent.objects.create(**self.payload(event_id))
        with self.assertRaises(IntegrityError), transaction.atomic():
            LearningInteractionEvent.objects.create(**self.payload(event_id))
