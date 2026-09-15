import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from .models import Course, MomentarySelfReport, Session, TemporalSession, User


class MomentarySelfReportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pr29", password="test-only")
        course = Course.objects.create(title="PR29", owner=self.user)
        source = Session.objects.create(course=course, student=self.user, created_by=self.user, started_at=timezone.now())
        self.temporal = TemporalSession.objects.create(participant=self.user, course_session=source, started_at=source.started_at)

    def test_omission_is_first_class_and_non_blocking(self):
        report = MomentarySelfReport(request_id=uuid.uuid4(), temporal_session=self.temporal, participant=self.user, prompt_version="neutral-v1", response="omitted", requested_at=timezone.now())
        report.full_clean()
        report.save()
        self.assertIsNone(report.responded_at)

    def test_rejects_response_before_prompt(self):
        now = timezone.now()
        report = MomentarySelfReport(request_id=uuid.uuid4(), temporal_session=self.temporal, participant=self.user, prompt_version="neutral-v1", response="focused", requested_at=now, responded_at=now - timedelta(seconds=1))
        with self.assertRaises(ValidationError):
            report.full_clean()

    def test_request_id_is_idempotent(self):
        request_id = uuid.uuid4()
        MomentarySelfReport.objects.create(request_id=request_id, temporal_session=self.temporal, participant=self.user, prompt_version="neutral-v1", response="omitted", requested_at=timezone.now())
        with self.assertRaises(IntegrityError), transaction.atomic():
            MomentarySelfReport.objects.create(request_id=request_id, temporal_session=self.temporal, participant=self.user, prompt_version="neutral-v1", response="omitted", requested_at=timezone.now())
