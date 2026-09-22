from django.core.management.base import BaseCommand, CommandError

from api.models import ModelArtifact


NAME = "masked-gru-observable-evidence"
VERSION = "masked-gru-observable-evidence-v1-synthetic"
SHA256 = "ee636d2e89298bebfe6e47aa0eb25bf25948ea6d4bce007bda3286ec1366b475"
THRESHOLD = 0.013582718558609486


class Command(BaseCommand):
    help = "Registra el artefacto canónico GRU v1 para validación Edge en shadow."

    def handle(self, *args, **options):
        existing = ModelArtifact.objects.filter(name=NAME, version=VERSION).first()
        if existing:
            if existing.artifact_sha256 != SHA256:
                raise CommandError("La versión ya existe con un SHA-256 distinto.")
            self.stdout.write(self.style.SUCCESS(f"Artefacto ya registrado: {existing.pk}"))
            return
        artifact = ModelArtifact.objects.create(
            name=NAME,
            version=VERSION,
            artifact_sha256=SHA256,
            artifact_uri="/models/masked-gru-observable-evidence-v1-synthetic.json",
            algorithm="masked_gru_hidden8",
            feature_contract="normalized-features-v1",
            dataset_reference="synthetic-engineering-v1",
            code_revision="8e03d04",
            metrics={"coverage": 0.975, "auroc": 1.0, "auprc": 1.0},
            thresholds={"task_oriented_evidence": THRESHOLD},
            evaluation={
                "validity_status": "synthetic_only",
                "validity_report_reference": "docs/MODEL_V1/MODEL_CARD.md",
                "fairness_status": "pending_independent_review",
                "fairness_report_reference": None,
                "deployment_eligibility": "shadow_only",
            },
            status=ModelArtifact.STATUS_CANDIDATE,
        )
        self.stdout.write(self.style.SUCCESS(f"Artefacto registrado: {artifact.pk}"))
