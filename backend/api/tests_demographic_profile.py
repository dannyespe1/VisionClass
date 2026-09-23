from datetime import timedelta

from cryptography.fernet import Fernet
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    ConsentEvent,
    DemographicVaultAudit,
    DemographicVaultRecord,
    ResearchPseudonymMap,
    User,
)
from .demographic_vault import read_demographics


KEY = Fernet.generate_key().decode("ascii")


@override_settings(
    DEMOGRAPHIC_VAULT=True,
    DEMOGRAPHIC_VAULT_KEY=KEY,
    DEMOGRAPHIC_RETENTION_DAYS=30,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="demographic-test-v1",
)
class DemographicProfileAPITests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="demographic-student",
            password="test-only",
            role=User.ROLE_STUDENT,
        )
        self.admin = User.objects.create_user(
            username="demographic-admin",
            password="test-only",
            role=User.ROLE_ADMIN,
        )
        self.client.force_authenticate(self.student)

    def grant_research(self):
        ConsentEvent.objects.create(
            participant=self.student,
            version="demographic-test-v1",
            purpose=ConsentEvent.PURPOSE_RESEARCH,
            action=ConsentEvent.ACTION_GRANT,
            expires_at=timezone.now() + timedelta(days=10),
            source="test",
        )

    def payload(self, **overrides):
        return {
            "age_band": "18-20",
            "gender_self_description": "femenino",
            "voluntary_confirmation": True,
            **overrides,
        }

    def test_voluntary_response_is_encrypted_pseudonymous_and_not_echoed(self):
        self.grant_research()
        response = self.client.post("/api/demographics/profile/", self.payload(), format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["registered"])
        self.assertEqual(response.data["age_band"], "18-20")
        self.assertNotIn("gender_self_description", response.data)
        mapping = ResearchPseudonymMap.objects.get(participant=self.student)
        record = DemographicVaultRecord.objects.get(research_pseudonym=mapping.research_pseudonym)
        self.assertNotIn(b"femenino", bytes(record.encrypted_payload))
        self.assertEqual(record.consent_version, "demographic-test-v1")
        self.assertLessEqual(record.retention_until, timezone.now() + timedelta(days=10))
        self.assertEqual(
            read_demographics(self.admin, mapping.research_pseudonym),
            {"age_band": "a01", "gender_self_description": "g02"},
        )
        audit = DemographicVaultAudit.objects.get(action="self_write")
        self.assertEqual(audit.outcome, "allowed")
        self.assertNotIn(str(mapping.research_pseudonym), audit.pseudonym_digest)

    def test_research_consent_and_exact_categories_are_required(self):
        denied = self.client.post("/api/demographics/profile/", self.payload(), format="json")
        self.assertEqual(denied.status_code, 403)

        self.grant_research()
        invalid_age = self.client.post(
            "/api/demographics/profile/",
            self.payload(age_band="21-24"),
            format="json",
        )
        invalid_gender = self.client.post(
            "/api/demographics/profile/",
            self.payload(gender_self_description="sin-categoria"),
            format="json",
        )
        not_voluntary = self.client.post(
            "/api/demographics/profile/",
            self.payload(voluntary_confirmation=False),
            format="json",
        )
        self.assertEqual(invalid_age.status_code, 400)
        self.assertEqual(invalid_gender.status_code, 400)
        self.assertEqual(not_voluntary.status_code, 400)
        self.assertEqual(DemographicVaultRecord.objects.count(), 0)

    def test_participant_can_withdraw_without_deleting_pseudonym_mapping(self):
        self.grant_research()
        self.client.post("/api/demographics/profile/", self.payload(), format="json")

        response = self.client.delete("/api/demographics/profile/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["registered"])
        self.assertEqual(DemographicVaultRecord.objects.count(), 0)
        self.assertEqual(ResearchPseudonymMap.objects.filter(participant=self.student).count(), 1)
        self.assertTrue(DemographicVaultAudit.objects.filter(action="self_delete", outcome="allowed").exists())

    def test_non_student_cannot_access_profile(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/demographics/profile/")
        self.assertEqual(response.status_code, 403)

    def test_research_consent_revocation_removes_demographic_response(self):
        self.grant_research()
        self.client.post("/api/demographics/profile/", self.payload(), format="json")

        response = self.client.post(
            "/api/consents/",
            {
                "version": "demographic-test-v1",
                "purpose": ConsentEvent.PURPOSE_RESEARCH,
                "action": ConsentEvent.ACTION_REVOKE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(DemographicVaultRecord.objects.count(), 0)
        self.assertTrue(DemographicVaultAudit.objects.filter(action="self_delete").exists())
