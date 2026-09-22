import hashlib
import uuid
from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    ConsentEvent,
    Course,
    DeviceBudgetTelemetry,
    InferredState,
    ModelArtifact,
    ObservationWindow,
    ResearchAccessRequest,
    ResearchExportLease,
    ResearchPseudonymMap,
    SecurityAuditEvent,
    Session,
    TemporalSession,
    User,
)


@override_settings(
    RESEARCH_DASHBOARD=True,
    RESEARCH_DASHBOARD_MIN_PARTICIPANTS=20,
    RESEARCH_DASHBOARD_MIN_OBSERVABLE_WINDOWS=100,
    RESEARCH_EXPORT_MAX_MINUTES=30,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="research-test-v1",
)
class ResearchDashboardTests(APITestCase):
    def setUp(self):
        self.researcher = User.objects.create_user(
            username="pr37-researcher", password="test-only", role=User.ROLE_RESEARCHER
        )
        self.teacher = User.objects.create_user(
            username="pr37-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.course = Course.objects.create(
            title="Cohorte sintética", category="synthetic-cohort", owner=self.teacher
        )
        self.artifact = ModelArtifact.objects.create(
            name="observable-evidence",
            version="1.2.0",
            artifact_sha256="a" * 64,
            artifact_uri="local://synthetic/model",
            algorithm="fixture",
            feature_contract="features-v2",
            dataset_reference="synthetic-dataset-v3",
            code_revision="deadbeef",
            metrics={"auroc": 0.81, "private_metric": 123},
            evaluation={
                "validity_status": "synthetic_only",
                "validity_report_reference": "D03-synthetic",
                "fairness_status": "pending_independent_review",
                "fairness_report_reference": "D08-pending",
            },
        )
        self.model_key = f"{self.artifact.name}:{self.artifact.version}"
        self.grant = ResearchAccessRequest.objects.create(
            researcher="Investigador de prueba",
            institution="Institución sintética",
            project="Evaluación técnica controlada",
            data_requested="Agregados y resumen seudonimizado",
            status=ResearchAccessRequest.STATUS_APPROVED,
            ethics_approval=True,
            principal=self.researcher,
            purpose="Validar reproducibilidad técnica en datos sintéticos",
            expires_at=timezone.now() + timedelta(days=7),
            cohort_scope=["synthetic-cohort"],
            model_scope=[self.model_key],
            profile_scope=["balanced"],
        )
        self.client.force_authenticate(self.researcher)

    def add_participants(self, count, *, windows=5):
        now = timezone.now()
        for index in range(count):
            participant = User.objects.create_user(
                username=f"synthetic-participant-{index}-{uuid.uuid4().hex[:5]}",
                role=User.ROLE_STUDENT,
            )
            ConsentEvent.objects.create(
                participant=participant,
                purpose=ConsentEvent.PURPOSE_RESEARCH,
                action=ConsentEvent.ACTION_GRANT,
                version="research-test-v1",
                expires_at=now + timedelta(days=1),
            )
            ResearchPseudonymMap.objects.create(
                participant=participant, research_pseudonym=uuid.uuid4()
            )
            source = Session.objects.create(
                course=self.course,
                student=participant,
                created_by=self.teacher,
                started_at=now - timedelta(hours=1),
                ended_at=now,
            )
            temporal = TemporalSession.objects.create(
                participant=participant,
                course_session=source,
                started_at=source.started_at,
                ended_at=source.ended_at,
                provenance={"fixture": "synthetic"},
            )
            DeviceBudgetTelemetry.objects.create(
                course_session=source,
                profile="balanced",
                profile_generation=1,
                device_class="standard",
                fps_bucket="10_to_14",
                latency_bucket="50_to_99",
                memory_bucket="3_to_4",
                network_bucket="slow",
                cpu_load_bucket="busy",
                energy_bucket="saver",
                sample_count=5,
                expires_at=now + timedelta(hours=2),
            )
            for window_index in range(windows):
                started_at = source.started_at + timedelta(seconds=window_index * 6)
                window = ObservationWindow.objects.create(
                    temporal_session=temporal,
                    started_at=started_at,
                    ended_at=started_at + timedelta(seconds=5),
                    aggregation_version="aggregate-v2",
                    features={"fixture": "never-exported"},
                    quality={"synthetic": True},
                )
                state = (
                    InferredState.STATE_TASK_ORIENTED_EVIDENCE
                    if window_index < 3
                    else InferredState.STATE_OFF_TASK_EVIDENCE
                )
                InferredState.objects.create(
                    window=window,
                    state=state,
                    probabilities={state: 0.9},
                    uncertainty=0.2,
                    model_reference=self.model_key,
                    model_artifact=self.artifact,
                    inference_version="inference-v4",
                    inferred_at=window.ended_at,
                    provenance={"fixture": "synthetic"},
                )

    def filters(self):
        return {
            "grant_id": self.grant.id,
            "period": "90d",
            "cohort": "synthetic-cohort",
            "model": self.model_key,
            "profile": "balanced",
        }

    @override_settings(RESEARCH_DASHBOARD=False)
    def test_feature_flag_fails_closed(self):
        self.assertEqual(self.client.get(reverse("research_dashboard")).status_code, 404)

    def test_role_and_active_bound_grant_are_required_and_audited(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get(reverse("research_dashboard"))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(
            SecurityAuditEvent.objects.filter(
                actor=self.teacher, action="research_dashboard_access", outcome="denied"
            ).exists()
        )
        unbound = User.objects.create_user(username="unbound-researcher", role=User.ROLE_RESEARCHER)
        self.client.force_authenticate(unbound)
        self.assertEqual(self.client.get(reverse("research_dashboard")).status_code, 403)

    def test_dashboard_is_reproducible_provenanced_and_non_identifying(self):
        self.add_participants(20)
        response = self.client.get(reverse("research_dashboard"), self.filters())
        self.assertEqual(response.status_code, 200)
        cell = response.data["cells"][0]
        self.assertEqual(cell["status"], "published")
        self.assertEqual(cell["participant_band"], "20-39")
        self.assertEqual(cell["sample"]["total_windows"], 100)
        self.assertEqual(cell["sample"]["observable_windows"], 100)
        self.assertEqual(cell["observable_distribution"]["task_oriented_evidence_ratio"], 0.6)
        self.assertEqual(cell["provenance"]["model_version"], "1.2.0")
        self.assertEqual(cell["provenance"]["dataset_reference"], "synthetic-dataset-v3")
        self.assertEqual(cell["validity_evidence"]["status"], "synthetic_only")
        self.assertNotIn("private_metric", cell["registry_metrics"])
        serialized = str(response.data)
        self.assertNotIn("synthetic-participant", serialized)
        self.assertNotIn("never-exported", serialized)
        self.assertTrue(
            SecurityAuditEvent.objects.filter(action="research_dashboard_access", outcome="allowed").exists()
        )

    def test_dashboard_adds_only_aggregate_edge_validation_fields(self):
        self.add_participants(20)
        inference = InferredState.objects.order_by("id").first()
        inference.probabilities = {
            InferredState.STATE_OFF_TASK_EVIDENCE: 0.1,
            InferredState.STATE_TASK_ORIENTED_EVIDENCE: 0.9,
        }
        inference.provenance = {
            "source": "edge_shadow_inference",
            "artifact_integrity": "sha256_verified_by_client_and_registry_matched",
        }
        inference.save(update_fields=["probabilities", "provenance"])
        inference.window.provenance = {"execution_profile": "balanced"}
        inference.window.save(update_fields=["provenance"])
        response = self.client.get(reverse("research_dashboard"), self.filters())
        edge = response.data["cells"][0]["edge_validation"]
        self.assertEqual(edge["local_execution_ratio"], 0.01)
        self.assertEqual(edge["registry_integrity_ratio"], 1.0)
        self.assertEqual(edge["mean_task_oriented_probability"], 0.9)
        self.assertEqual(edge["profiles"], {"balanced": 1.0})
        self.assertNotIn("participant", str(edge))

    def test_small_cells_are_suppressed_without_exact_counts(self):
        self.add_participants(19, windows=6)
        response = self.client.get(reverse("research_dashboard"), self.filters())
        self.assertEqual(response.status_code, 200)
        cell = response.data["cells"][0]
        self.assertEqual(cell, {
            "cohort": "synthetic-cohort",
            "model": self.model_key,
            "profile": "balanced",
            "status": "suppressed",
            "reason_code": "minimum_participants",
        })

    def test_filters_cannot_escape_grant_scope(self):
        filters = self.filters()
        filters["cohort"] = "secret-cohort"
        response = self.client.get(reverse("research_dashboard"), filters)
        self.assertEqual(response.status_code, 400)
        self.assertTrue(
            SecurityAuditEvent.objects.filter(reason_code="filter_outside_grant").exists()
        )

    def test_export_is_pseudonymous_one_time_bounded_and_audited(self):
        self.add_participants(20)
        payload = {**self.filters(), "purpose": self.grant.purpose, "expires_in_minutes": 10}
        created = self.client.post(reverse("research_export_create"), payload, format="json")
        self.assertEqual(created.status_code, 201)
        token = created.data["download_token"]
        lease = ResearchExportLease.objects.get(export_id=created.data["export_id"])
        self.assertEqual(lease.token_digest, hashlib.sha256(token.encode()).hexdigest())
        self.assertNotEqual(lease.token_digest, token)
        self.assertLessEqual(lease.expires_at, self.grant.expires_at)

        downloaded = self.client.post(
            reverse("research_export_download"), {"download_token": token}, format="json"
        )
        self.assertEqual(downloaded.status_code, 200)
        csv_text = downloaded.content.decode("utf-8")
        self.assertIn("research_pseudonym", csv_text)
        self.assertIn("dataset_reference", csv_text)
        self.assertNotIn("synthetic-participant", csv_text)
        self.assertNotIn("probabilities", csv_text)
        self.assertEqual(downloaded["Cache-Control"], "no-store")
        reused = self.client.post(
            reverse("research_export_download"), {"download_token": token}, format="json"
        )
        self.assertEqual(reused.status_code, 410)
        self.assertTrue(SecurityAuditEvent.objects.filter(action="research_export_create", outcome="allowed").exists())
        self.assertTrue(SecurityAuditEvent.objects.filter(action="research_export_download", outcome="allowed").exists())

    def test_export_rechecks_consent_at_download(self):
        self.add_participants(20)
        payload = {**self.filters(), "purpose": self.grant.purpose, "expires_in_minutes": 10}
        created = self.client.post(reverse("research_export_create"), payload, format="json")
        participant = User.objects.filter(username__startswith="synthetic-participant").first()
        ConsentEvent.objects.create(
            participant=participant,
            purpose=ConsentEvent.PURPOSE_RESEARCH,
            action=ConsentEvent.ACTION_REVOKE,
            version="research-test-v1",
        )
        response = self.client.post(
            reverse("research_export_download"),
            {"download_token": created.data["download_token"]},
            format="json",
        )
        self.assertEqual(response.status_code, 409)

    def test_export_fails_closed_when_grant_is_revoked(self):
        self.add_participants(20)
        payload = {**self.filters(), "purpose": self.grant.purpose, "expires_in_minutes": 10}
        created = self.client.post(reverse("research_export_create"), payload, format="json")
        self.grant.status = ResearchAccessRequest.STATUS_REJECTED
        self.grant.save(update_fields=["status"])
        response = self.client.post(
            reverse("research_export_download"),
            {"download_token": created.data["download_token"]},
            format="json",
        )
        self.assertEqual(response.status_code, 410)

    def test_revoke_rejects_malformed_identifier_without_server_error(self):
        response = self.client.post(
            reverse("research_export_revoke"), {"export_id": "not-a-uuid"}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_export_rejects_small_sample_and_mismatched_purpose(self):
        self.add_participants(19, windows=6)
        payload = {**self.filters(), "purpose": self.grant.purpose, "expires_in_minutes": 10}
        self.assertEqual(
            self.client.post(reverse("research_export_create"), payload, format="json").status_code,
            409,
        )
        payload["purpose"] = "Otro propósito"
        self.assertEqual(
            self.client.post(reverse("research_export_create"), payload, format="json").status_code,
            400,
        )
