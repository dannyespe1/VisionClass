import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from .models import Course, ObservationWindow, ObserverAnnotation, ObserverAssignment, Session, TemporalSession, User


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
