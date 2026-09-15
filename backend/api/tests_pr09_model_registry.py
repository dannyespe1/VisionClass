from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import ModelArtifact


def model_payload(version="1.0.0", digest=None, status=ModelArtifact.STATUS_CANDIDATE):
    return {
        "name": "attention-baseline",
        "version": version,
        "artifact_sha256": digest or ("a" * 64),
        "artifact_uri": "artifact://models/attention-baseline/1.0.0/model.onnx",
        "algorithm": "cnn-lstm",
        "feature_contract": "features-v1",
        "dataset_reference": "dataset-manifest-v1",
        "code_revision": "0123456789abcdef",
        "metrics": {"mae": 0.1},
        "evaluation": {"protocol": "evaluation-v1"},
        "status": status,
    }


class ModelRegistryTests(TestCase):
    def test_rejects_invalid_artifact_hash(self):
        artifact = ModelArtifact(**model_payload(digest="not-a-sha256"))
        with self.assertRaises(ValidationError):
            artifact.save()

    def test_only_one_active_version_per_model(self):
        ModelArtifact.objects.create(**model_payload(status=ModelArtifact.STATUS_ACTIVE))
        second = model_payload(version="1.1.0", digest="b" * 64, status=ModelArtifact.STATUS_ACTIVE)
        with self.assertRaises((ValidationError, IntegrityError)), transaction.atomic():
            ModelArtifact.objects.create(**second)

    def test_retirement_preserves_registry_history(self):
        artifact = ModelArtifact.objects.create(**model_payload(status=ModelArtifact.STATUS_ACTIVE))
        artifact.status = ModelArtifact.STATUS_RETIRED
        artifact.save(update_fields=["status", "updated_at"])
        self.assertEqual(ModelArtifact.objects.get(pk=artifact.pk).status, ModelArtifact.STATUS_RETIRED)
        self.assertEqual(artifact.artifact_sha256, "a" * 64)

    def test_binary_content_is_not_stored_in_registry(self):
        artifact = ModelArtifact.objects.create(**model_payload())
        field_names = {field.name for field in artifact._meta.fields}
        self.assertIn("artifact_uri", field_names)
        self.assertNotIn("artifact_bytes", field_names)
