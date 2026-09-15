import uuid
from datetime import timedelta

from cryptography.fernet import Fernet
from django.core.exceptions import PermissionDenied
from django.test import TestCase, override_settings
from django.utils import timezone

from .demographic_vault import read_demographics, store_demographics
from .models import DemographicVaultAudit, DemographicVaultRecord, User


KEY = Fernet.generate_key().decode("ascii")


@override_settings(DEMOGRAPHIC_VAULT=True, DEMOGRAPHIC_VAULT_KEY=KEY)
class DemographicVaultTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="vault-admin", password="test-only", role=User.ROLE_ADMIN)
        self.student = User.objects.create_user(username="vault-student", password="test-only")
        self.pseudonym = uuid.uuid4()

    def test_payload_is_encrypted_and_not_linked_to_operational_user(self):
        payload = {"age_band": "18-24", "voluntary_group": "group-a"}
        record = store_demographics(self.admin, self.pseudonym, payload, "pending-v1", timezone.now() + timedelta(days=30))
        self.assertNotIn(b"18-24", bytes(record.encrypted_payload))
        fields = {field.name for field in DemographicVaultRecord._meta.fields}
        self.assertFalse(fields & {"participant", "user", "session"})
        self.assertEqual(read_demographics(self.admin, self.pseudonym), payload)

    def test_operational_user_is_denied_and_audited(self):
        with self.assertRaises(PermissionDenied):
            read_demographics(self.student, self.pseudonym)
        audit = DemographicVaultAudit.objects.get()
        self.assertEqual(audit.outcome, "denied")
        self.assertNotIn(str(self.pseudonym), audit.pseudonym_digest)

    def test_unknown_or_content_fields_are_rejected(self):
        with self.assertRaises(ValueError):
            store_demographics(self.admin, self.pseudonym, {"course_answer": "private"}, "pending-v1", timezone.now() + timedelta(days=30))
