from django.core.exceptions import ValidationError
import uuid
from io import StringIO
from datetime import timedelta

from django.test import TestCase, override_settings
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from .model_rollout import (
    DEFAULT_THRESHOLDS,
    choose_models,
    create_alias,
    evaluate_and_rollback,
    promote,
    rollback,
    start_canary,
    start_shadow,
)
from .models import (
    Course, InferredState, ModelAlias, ModelArtifact, ModelRolloutEvent,
    ObservationWindow, Session, TemporalSession, User,
)


def artifact(version, digest, status):
    return ModelArtifact.objects.create(
        name="temporal-evidence",
        version=version,
        artifact_sha256=digest * 64,
        artifact_uri=f"artifact://temporal/{version}/model.json",
        algorithm="observable-evidence-hmm",
        feature_contract="temporal-inference-v1",
        dataset_reference="synthetic-test-only",
        code_revision="0123456789abcdef",
        metrics={"ece": 0.05},
        evaluation={"protocol": "evaluation-v1"},
        status=status,
    )


class ModelRolloutTests(TestCase):
    def setUp(self):
        self.stable = artifact("stable-v1", "a", ModelArtifact.STATUS_ACTIVE)
        self.candidate = artifact("candidate-v2", "b", ModelArtifact.STATUS_VALIDATED)
        self.alias = create_alias(
            environment="test",
            name="temporal-default",
            active_model=self.stable,
            recorded_by="test-operator",
        )

    def metrics(self, **overrides):
        value = {
            "sample_count": 100,
            "p95_latency_ms": 20.0,
            "error_rate": 0.0,
            "calibration_error": 0.05,
        }
        value.update(overrides)
        return value

    def test_shadow_never_routes_effective_output_to_candidate(self):
        alias = start_shadow(self.alias.pk, self.candidate, recorded_by="test-operator")
        for index in range(200):
            decision = choose_models(alias, f"opaque:{index}")
            self.assertEqual(decision.effective_model, self.stable)
            self.assertEqual(decision.shadow_model, self.candidate)
            self.assertEqual(decision.reason_code, "shadow_isolation")

    def test_canary_is_deterministic_and_bounded(self):
        start_shadow(self.alias.pk, self.candidate, recorded_by="test-operator")
        alias = start_canary(self.alias.pk, 10, recorded_by="test-operator")
        first = [choose_models(alias, f"opaque:{index}").selected_role for index in range(1000)]
        second = [choose_models(alias, f"opaque:{index}").selected_role for index in range(1000)]
        self.assertEqual(first, second)
        candidate_count = first.count("candidate")
        self.assertGreater(candidate_count, 50)
        self.assertLess(candidate_count, 150)

    def test_defective_canary_rolls_back_without_changing_stable_model(self):
        start_shadow(self.alias.pk, self.candidate, recorded_by="test-operator")
        start_canary(self.alias.pk, 10, recorded_by="test-operator")
        alias = evaluate_and_rollback(
            self.alias.pk,
            self.metrics(error_rate=0.25),
            recorded_by="rollout-monitor",
        )
        self.assertEqual(alias.mode, ModelAlias.MODE_STABLE)
        self.assertEqual(alias.active_model_id, self.stable.pk)
        self.assertIsNone(alias.candidate_model_id)
        event = alias.events.latest("created_at")
        self.assertEqual(event.action, "rolled_back")
        self.assertEqual(event.reason_code, "automatic_threshold_breach")
        self.assertIn("error_threshold", event.metrics["violations"])

    def test_promotion_and_rollback_restore_previous_version_without_data_migration(self):
        start_shadow(self.alias.pk, self.candidate, recorded_by="test-operator")
        start_canary(self.alias.pk, 10, recorded_by="test-operator")
        alias = promote(self.alias.pk, self.metrics(), recorded_by="test-operator")
        self.assertEqual(alias.active_model_id, self.candidate.pk)
        self.assertEqual(alias.previous_model_id, self.stable.pk)
        alias = rollback(
            alias.pk,
            reason_code="controlled_rollback_test",
            recorded_by="test-operator",
        )
        self.assertEqual(alias.active_model_id, self.stable.pk)
        self.assertEqual(alias.previous_model_id, self.candidate.pk)
        self.assertEqual(ModelRolloutEvent.objects.filter(alias=alias).count(), 5)

    def test_insufficient_evidence_cannot_promote(self):
        start_shadow(self.alias.pk, self.candidate, recorded_by="test-operator")
        start_canary(self.alias.pk, 10, recorded_by="test-operator")
        with self.assertRaises(ValidationError):
            promote(self.alias.pk, self.metrics(sample_count=99), recorded_by="test-operator")

    def test_audit_events_are_immutable(self):
        event = self.alias.events.get(action="alias_created")
        event.reason_code = "changed"
        with self.assertRaises(ValidationError):
            event.save()
        with self.assertRaises(ValidationError):
            event.delete()

    def test_default_thresholds_are_explicit(self):
        self.assertEqual(self.alias.thresholds, DEFAULT_THRESHOLDS)

    def test_operational_command_reports_current_alias_without_secrets(self):
        output = StringIO()
        call_command("manage_model_rollout", "status", "--alias-id", self.alias.pk, stdout=output)
        value = output.getvalue()
        self.assertIn('"active_version": "stable-v1"', value)
        self.assertNotIn("artifact_uri", value)


@override_settings(
    TEMPORAL_INFERENCE_API=True,
    ML_SERVICE_IDENTITY=True,
    ML_SERVICE_TOKEN="rollout-service-token-with-at-least-32-characters",
    ML_SERVICE_SCOPES=("temporal:write",),
)
class RolloutPersistenceContractTests(APITestCase):
    def setUp(self):
        participant = User.objects.create_user(username="rollout-participant")
        course = Course.objects.create(title="Synthetic Rollout", owner=participant)
        source = Session.objects.create(
            course=course, student=participant, created_by=participant, started_at=timezone.now()
        )
        temporal = TemporalSession.objects.create(
            participant=participant, course_session=source, started_at=source.started_at
        )
        self.window = ObservationWindow.objects.create(
            temporal_session=temporal,
            started_at=source.started_at,
            ended_at=source.started_at + timedelta(seconds=5),
            aggregation_version="window-v1",
        )
        self.stable = artifact("stable-contract-v1", "c", ModelArtifact.STATUS_ACTIVE)
        self.candidate = artifact("candidate-contract-v2", "d", ModelArtifact.STATUS_VALIDATED)
        self.alias = create_alias(
            environment="test-contract",
            name="temporal-default",
            active_model=self.stable,
            recorded_by="test-operator",
        )
        self.alias = start_shadow(self.alias.pk, self.candidate, recorded_by="test-operator")

    def payload(self):
        return {
            "contract_version": "1.0",
            "inference_id": str(uuid.uuid4()),
            "window_id": self.window.pk,
            "model_id": self.stable.version,
            "inference_version": "observable-evidence-hmm-v1",
            "state": "task_oriented_evidence",
            "probabilities": {"off_task_evidence": 0.1, "task_oriented_evidence": 0.9},
            "uncertainty": 0.2,
            "quality": {"observable": True, "confidence": 0.8, "reason": None, "sample_count": 4},
            "allow_intervention": False,
            "interpretation": "observable_evidence_not_internal_attention",
            "rollout": {
                "environment": self.alias.environment,
                "alias": self.alias.name,
                "mode": "shadow",
                "revision": self.alias.revision,
                "active_model_id": self.stable.version,
                "candidate_model_id": self.candidate.version,
                "effective_model_id": self.stable.version,
                "selected_role": "active",
                "selection_reason": "shadow_isolation",
                "active_latency_ms": 1.0,
                "candidate_latency_ms": 1.2,
                "candidate_error": False,
                "outputs_agree": False,
            },
        }

    def post(self, payload):
        return self.client.post(
            "/api/internal/ml/temporal-inferences/",
            payload,
            format="json",
            HTTP_AUTHORIZATION="Service rollout-service-token-with-at-least-32-characters",
        )

    def test_shadow_telemetry_is_audited_but_stable_is_effective(self):
        response = self.post(self.payload())
        self.assertEqual(response.status_code, 201)
        inference = InferredState.objects.get()
        self.assertEqual(inference.model_artifact_id, self.stable.pk)
        self.assertEqual(response.data["model_id"], self.stable.version)
        self.assertFalse(response.data["rollout"]["outputs_agree"])

    def test_shadow_candidate_cannot_be_persisted_as_effective(self):
        payload = self.payload()
        payload["model_id"] = self.candidate.version
        payload["rollout"]["effective_model_id"] = self.candidate.version
        payload["rollout"]["selected_role"] = "candidate"
        response = self.post(payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(InferredState.objects.count(), 0)
