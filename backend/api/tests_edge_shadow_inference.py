from datetime import timedelta
import uuid

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    ConsentEvent,
    Course,
    Enrollment,
    InferredState,
    ModelArtifact,
    Observation,
    ObservationWindow,
    Session,
    User,
)


MODEL_VERSION = "masked-gru-observable-evidence-v1-synthetic"
MODEL_SHA = "e" * 64


@override_settings(
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="edge-test-v1",
    TEMPORAL_SCHEMA_V2=True,
    MODEL_REGISTRY=True,
    NORMALIZED_FEATURES_V1=True,
    QUALITY_GATE_V1=True,
    EDGE_SHADOW_REPORTING=True,
    EDGE_SHADOW_REPORT_MIN_INTERVAL_SECONDS=5,
    EDGE_SHADOW_REPORT_MAX_BYTES=4096,
    STRICT_EVENT_IDENTITY=True,
)
class EdgeShadowInferenceTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="edge-shadow-student", role=User.ROLE_STUDENT)
        self.course = Course.objects.create(title="Edge shadow", owner=self.student)
        Enrollment.objects.create(user=self.student, course=self.course, status=Enrollment.STATUS_ACTIVE)
        self.session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now() - timedelta(minutes=1),
        )
        self.artifact = ModelArtifact.objects.create(
            name="masked-gru-observable-evidence",
            version=MODEL_VERSION,
            artifact_sha256=MODEL_SHA,
            artifact_uri="/models/test.json",
            algorithm="masked_gru_hidden8",
            feature_contract="normalized-features-v1",
            dataset_reference="synthetic-test",
            code_revision="test",
            metrics={"coverage": 1.0},
            thresholds={"task_oriented_evidence": 0.6},
            evaluation={"validity_status": "synthetic_only"},
        )
        self.client.force_authenticate(self.student)

    def grant(self, *purposes):
        for purpose in purposes:
            ConsentEvent.objects.create(
                participant=self.student,
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                version="edge-test-v1",
                expires_at=timezone.now() + timedelta(days=1),
            )

    def grant_all(self):
        self.grant(
            ConsentEvent.PURPOSE_LOCAL_PROCESSING,
            ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
            ConsentEvent.PURPOSE_RESEARCH,
        )

    def inference_payload(self, *, captured_at=None, **overrides):
        payload = {
            "contract_version": "edge-shadow-inference-v2",
            "inference_id": str(uuid.uuid4()),
            "session_id": self.session.pk,
            "captured_at": (captured_at or timezone.now()).isoformat(),
            "window_duration_ms": 5000,
            "execution_profile": "balanced",
            "profile_generation": 1,
            "quality": {
                "observable": True,
                "confidence": 0.8,
                "reason": None,
                "sample_count": 12,
            },
            "model_version": MODEL_VERSION,
            "artifact_sha256": MODEL_SHA,
            "state": "task_oriented_evidence",
            "probability": 0.8,
            "mode": "shadow_only",
            "allow_intervention": False,
            "interpretation": "observable_evidence_not_internal_attention",
            "execution_location": "local_device",
        }
        payload.update(overrides)
        return payload

    @override_settings(EDGE_SHADOW_REPORTING=False)
    def test_flag_fails_closed(self):
        self.assertEqual(
            self.client.post("/api/edge-shadow-inferences/", {}, format="json").status_code,
            503,
        )

    def test_research_consent_is_required(self):
        self.grant(ConsentEvent.PURPOSE_LOCAL_PROCESSING, ConsentEvent.PURPOSE_DERIVED_PERSISTENCE)
        response = self.client.post(
            "/api/edge-shadow-inferences/",
            self.inference_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_persists_only_minimal_edge_result_and_is_idempotent(self):
        self.grant_all()
        payload = self.inference_payload()
        first = self.client.post("/api/edge-shadow-inferences/", payload, format="json")
        second = self.client.post("/api/edge-shadow-inferences/", payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.data["duplicate"])
        self.assertEqual(Observation.objects.count(), 0)
        inference = InferredState.objects.get()
        self.assertEqual(inference.model_artifact, self.artifact)
        self.assertEqual(inference.provenance["execution_location"], "local_device")
        self.assertEqual(inference.provenance["execution_profile"], "balanced")
        self.assertFalse(inference.provenance["allow_intervention"])
        self.assertFalse(inference.provenance["raw_media_transmitted"])
        self.assertFalse(inference.provenance["normalized_features_transmitted"])
        self.assertEqual(inference.window.features, {})
        serialized = str(inference.provenance) + str(inference.window.features)
        self.assertNotIn("image", serialized)
        self.assertNotIn("face_center", serialized)

    def test_rejects_unknown_fields_hash_state_and_foreign_session(self):
        self.grant_all()
        raw = self.inference_payload(image="forbidden")
        self.assertEqual(self.client.post("/api/edge-shadow-inferences/", raw, format="json").status_code, 400)
        wrong_hash = self.inference_payload(artifact_sha256="a" * 64)
        self.assertEqual(self.client.post("/api/edge-shadow-inferences/", wrong_hash, format="json").status_code, 400)
        wrong_state = self.inference_payload(state="off_task_evidence")
        self.assertEqual(self.client.post("/api/edge-shadow-inferences/", wrong_state, format="json").status_code, 400)

        other = User.objects.create_user(username="other-edge-student", role=User.ROLE_STUDENT)
        Enrollment.objects.create(user=other, course=self.course, status=Enrollment.STATUS_ACTIVE)
        foreign = Session.objects.create(
            course=self.course,
            student=other,
            created_by=other,
            started_at=timezone.now() - timedelta(minutes=1),
        )
        response = self.client.post(
            "/api/edge-shadow-inferences/",
            self.inference_payload(session_id=foreign.pk),
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(InferredState.objects.count(), 0)
        self.assertEqual(ObservationWindow.objects.count(), 0)

    def test_no_observable_never_becomes_a_negative_decision(self):
        self.grant_all()
        payload = self.inference_payload(
            quality={"observable": False, "confidence": 0.0, "reason": "face_absent", "sample_count": 10},
            state="no_observable",
            probability=None,
        )
        response = self.client.post("/api/edge-shadow-inferences/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        inference = InferredState.objects.get()
        self.assertEqual(inference.state, InferredState.STATE_NO_OBSERVABLE)
        self.assertEqual(inference.probabilities, {})
        self.assertIsNone(inference.uncertainty)

    @override_settings(EDGE_SHADOW_REPORT_MAX_BYTES=1024)
    def test_rejects_oversized_reports(self):
        self.grant_all()
        response = self.client.post(
            "/api/edge-shadow-inferences/",
            {"padding": "x" * 2000},
            format="json",
        )
        self.assertEqual(response.status_code, 413)

    def test_server_enforces_minimum_report_interval(self):
        self.grant_all()
        captured = timezone.now()
        self.assertEqual(
            self.client.post(
                "/api/edge-shadow-inferences/",
                self.inference_payload(captured_at=captured),
                format="json",
            ).status_code,
            201,
        )
        limited = self.client.post(
            "/api/edge-shadow-inferences/",
            self.inference_payload(captured_at=captured + timedelta(seconds=1)),
            format="json",
        )
        self.assertEqual(limited.status_code, 409)
        self.assertEqual(limited.data["detail"], "report_interval_not_elapsed")
