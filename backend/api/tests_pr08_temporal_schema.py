import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from .models import (
    Course,
    InferredState,
    Observation,
    ObservationWindow,
    Session,
    TemporalSession,
    User,
)


class TemporalSchemaTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pr08-user", password="test-only")
        self.course = Course.objects.create(title="PR08", owner=self.user)
        self.source = Session.objects.create(
            course=self.course,
            student=self.user,
            created_by=self.user,
            started_at=timezone.now(),
        )
        self.temporal = TemporalSession.objects.create(
            participant=self.user,
            course_session=self.source,
            started_at=self.source.started_at,
            provenance={"schema": "temporal-v2"},
        )

    def test_observation_and_inference_are_distinct_records(self):
        captured = timezone.now()
        observation = Observation.objects.create(
            temporal_session=self.temporal,
            event_id=uuid.uuid4(),
            kind="face_landmark_summary",
            captured_at=captured,
            received_at=captured + timedelta(milliseconds=10),
            values={"eye_ratio": 0.42},
            quality={"observable": True},
        )
        window = ObservationWindow.objects.create(
            temporal_session=self.temporal,
            started_at=captured,
            ended_at=captured + timedelta(seconds=5),
            aggregation_version="window-v1",
            features={"eye_ratio_mean": 0.42},
        )
        inferred = InferredState.objects.create(
            window=window,
            state=InferredState.STATE_UNKNOWN,
            probabilities={"unknown": 0.7, "attentive": 0.3},
            uncertainty=0.7,
            inference_version="rules-v1",
            inferred_at=window.ended_at,
        )

        self.assertEqual(Observation.objects.filter(pk=observation.pk).count(), 1)
        self.assertEqual(InferredState.objects.filter(pk=inferred.pk).count(), 1)
        self.assertNotIn("state", observation.values)
        self.assertEqual(inferred.state, "unknown")

    def test_no_observable_is_supported(self):
        start = timezone.now()
        window = ObservationWindow.objects.create(
            temporal_session=self.temporal,
            started_at=start,
            ended_at=start + timedelta(seconds=1),
            aggregation_version="window-v1",
            features={},
            quality={"observable": False},
        )
        state = InferredState.objects.create(
            window=window,
            state=InferredState.STATE_NO_OBSERVABLE,
            probabilities={"no_observable": 1.0},
            uncertainty=0.0,
            inference_version="rules-v1",
            inferred_at=window.ended_at,
        )
        self.assertEqual(state.state, "no_observable")

    def test_rejects_invalid_timestamp_order(self):
        captured = timezone.now()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Observation.objects.create(
                temporal_session=self.temporal,
                event_id=uuid.uuid4(),
                kind="invalid",
                captured_at=captured,
                received_at=captured - timedelta(seconds=1),
                values={},
            )
