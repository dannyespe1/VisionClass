import uuid
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Course, InferredState, ObservationWindow, Session, TemporalSession, User
from .temporal_inference import process_temporal_stream_event


TOKEN = "temporal-service-token-with-at-least-32-characters"


@override_settings(
    TEMPORAL_INFERENCE_API=True,
    TEMPORAL_INFERENCE_MAX_BYTES=16384,
    ML_SERVICE_IDENTITY=True,
    ML_SERVICE_TOKEN=TOKEN,
    ML_SERVICE_PREVIOUS_TOKEN="",
    ML_SERVICE_SCOPES=("events:write", "temporal:write"),
)
class TemporalInferencePersistenceTests(APITestCase):
    def setUp(self):
        participant = User.objects.create_user(username="temporal-participant")
        course = Course.objects.create(title="Synthetic Temporal", owner=participant)
        source = Session.objects.create(
            course=course,
            student=participant,
            created_by=participant,
            started_at=timezone.now(),
        )
        temporal = TemporalSession.objects.create(
            participant=participant,
            course_session=source,
            started_at=source.started_at,
        )
        self.window = ObservationWindow.objects.create(
            temporal_session=temporal,
            started_at=source.started_at,
            ended_at=source.started_at + timedelta(seconds=5),
            aggregation_version="window-v1",
            features={"orientation_probability": 0.8},
            quality={"observable": True},
        )

    def payload(self, inference_id=None):
        return {
            "contract_version": "1.0",
            "inference_id": str(inference_id or uuid.uuid4()),
            "window_id": self.window.pk,
            "model_id": "observable-evidence-hmm-v1",
            "inference_version": "observable-evidence-hmm-v1",
            "state": "task_oriented_evidence",
            "probabilities": {
                "off_task_evidence": 0.1,
                "task_oriented_evidence": 0.9,
            },
            "uncertainty": 0.2,
            "quality": {
                "observable": True,
                "confidence": 0.8,
                "reason": None,
                "sample_count": 4,
            },
            "allow_intervention": False,
            "interpretation": "observable_evidence_not_internal_attention",
        }

    def post(self, payload):
        return self.client.post(
            "/api/internal/ml/temporal-inferences/",
            payload,
            format="json",
            HTTP_AUTHORIZATION=f"Service {TOKEN}",
        )

    def test_persists_once_and_returns_stable_explanation(self):
        payload = self.payload()
        first = self.post(payload)
        duplicate = self.post(payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 200)
        self.assertTrue(duplicate.data["duplicate"])
        self.assertFalse(first.data["allow_intervention"])
        self.assertEqual(first.data["quality"]["observable"], True)
        self.assertEqual(InferredState.objects.count(), 1)
        inference = InferredState.objects.get()
        self.assertEqual(inference.model_reference, payload["model_id"])
        self.assertNotIn("features", first.data)

    def test_different_id_cannot_duplicate_window_model(self):
        self.assertEqual(self.post(self.payload()).status_code, 201)
        conflict = self.post(self.payload())
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.data["error"]["classification"], "definitive")
        self.assertEqual(InferredState.objects.count(), 1)

    def test_same_id_with_changed_result_is_a_conflict(self):
        payload = self.payload()
        self.assertEqual(self.post(payload).status_code, 201)
        payload["state"] = "off_task_evidence"
        payload["probabilities"] = {
            "off_task_evidence": 0.9,
            "task_oriented_evidence": 0.1,
        }
        response = self.post(payload)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "inference_id_conflict")

    def test_rejects_raw_media_and_intervention(self):
        raw = self.payload()
        raw["image"] = "forbidden"
        self.assertEqual(self.post(raw).data["error"]["code"], "raw_media_rejected")
        intervention = self.payload()
        intervention["allow_intervention"] = True
        response = self.post(intervention)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["classification"], "definitive")

    def test_missing_window_is_a_definitive_error(self):
        payload = self.payload()
        payload["window_id"] = self.window.pk + 999
        response = self.post(payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], {
            "classification": "definitive",
            "code": "window_invalid",
        })

    def test_requires_service_scope(self):
        response = self.client.post(
            "/api/internal/ml/temporal-inferences/",
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    @override_settings(TEMPORAL_INFERENCE_API=False)
    def test_feature_flag_is_retryable_safe_rollback(self):
        response = self.post(self.payload())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"], {
            "classification": "retryable",
            "code": "feature_disabled",
        })

    def test_stream_handler_uses_same_contract_and_is_idempotent(self):
        payload = self.payload()
        envelope = {
            "event_type": "temporal_inference",
            "data": payload,
        }
        first = process_temporal_stream_event(envelope)
        duplicate = process_temporal_stream_event(envelope)
        self.assertFalse(first.duplicate)
        self.assertTrue(duplicate.duplicate)
        self.assertEqual(InferredState.objects.count(), 1)
