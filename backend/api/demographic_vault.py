import hashlib
import json
import uuid

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.utils import timezone

from .consent import consent_status
from .models import (
    ConsentEvent,
    DemographicVaultAudit,
    DemographicVaultRecord,
    ResearchPseudonymMap,
)


ALLOWED_FIELDS = {"age_band", "gender_self_description", "accessibility_accommodation", "voluntary_group"}
APPROVED_AGE_BAND = "18-20"
APPROVED_GENDER_VALUES = {"masculino", "femenino", "otro"}
AGE_STORAGE_CODE = "a01"
GENDER_STORAGE_CODES = {"masculino": "g01", "femenino": "g02", "otro": "g03"}


def _digest(pseudonym):
    return hashlib.sha256(str(pseudonym).encode("utf-8")).hexdigest()


def _audit(actor, action, outcome, reason, pseudonym):
    DemographicVaultAudit.objects.create(actor=actor, action=action, outcome=outcome, reason_code=reason, pseudonym_digest=_digest(pseudonym))


def _authorize(actor, action, pseudonym):
    if not settings.DEMOGRAPHIC_VAULT:
        _audit(actor, action, "denied", "feature_disabled", pseudonym)
        raise PermissionDenied("Bóveda no disponible.")
    if not actor.is_authenticated or actor.role != actor.ROLE_ADMIN:
        _audit(actor, action, "denied", "insufficient_role", pseudonym)
        raise PermissionDenied("Acceso no autorizado.")
    if not settings.DEMOGRAPHIC_VAULT_KEY:
        _audit(actor, action, "denied", "key_unavailable", pseudonym)
        raise PermissionDenied("Bóveda no disponible.")


def store_demographics(actor, pseudonym, payload, consent_version, retention_until):
    _authorize(actor, "write", pseudonym)
    if not isinstance(payload, dict) or set(payload) - ALLOWED_FIELDS:
        _audit(actor, "write", "denied", "invalid_fields", pseudonym)
        raise ValueError("Campos demográficos no permitidos.")
    encrypted = Fernet(settings.DEMOGRAPHIC_VAULT_KEY.encode("ascii")).encrypt(json.dumps(payload, sort_keys=True).encode("utf-8"))
    record, _ = DemographicVaultRecord.objects.update_or_create(research_pseudonym=pseudonym, defaults={"encrypted_payload": encrypted, "consent_version": consent_version, "retention_until": retention_until})
    _audit(actor, "write", "allowed", "approved_role", pseudonym)
    return record


def read_demographics(actor, pseudonym):
    _authorize(actor, "read", pseudonym)
    record = DemographicVaultRecord.objects.get(research_pseudonym=pseudonym)
    value = json.loads(Fernet(settings.DEMOGRAPHIC_VAULT_KEY.encode("ascii")).decrypt(bytes(record.encrypted_payload)))
    _audit(actor, "read", "allowed", "approved_role", pseudonym)
    return value


def store_own_demographics(actor, payload, retention_until):
    """Store the authenticated participant's voluntary demographic response."""

    if not settings.DEMOGRAPHIC_VAULT or not settings.DEMOGRAPHIC_VAULT_KEY:
        raise PermissionDenied("Bóveda no disponible.")
    if not actor.is_authenticated or actor.role != actor.ROLE_STUDENT:
        raise PermissionDenied("Acceso no autorizado.")
    status = consent_status(actor)
    research = status["purposes"][ConsentEvent.PURPOSE_RESEARCH]
    if not research["granted"]:
        raise PermissionDenied("Se requiere consentimiento vigente para investigación.")
    if payload != {
        "age_band": APPROVED_AGE_BAND,
        "gender_self_description": payload.get("gender_self_description"),
    } or payload["gender_self_description"] not in APPROVED_GENDER_VALUES:
        raise ValueError("Categorías demográficas no autorizadas.")
    consent_expiry = research["expires_at"]
    if consent_expiry is not None:
        retention_until = min(retention_until, consent_expiry)
    if retention_until <= timezone.now():
        raise ValueError("La retención demográfica debe expirar en el futuro.")
    mapping, _ = ResearchPseudonymMap.objects.get_or_create(
        participant=actor,
        defaults={"research_pseudonym": uuid.uuid4()},
    )
    protected_payload = {
        "age_band": AGE_STORAGE_CODE,
        "gender_self_description": GENDER_STORAGE_CODES[payload["gender_self_description"]],
    }
    encrypted = Fernet(settings.DEMOGRAPHIC_VAULT_KEY.encode("ascii")).encrypt(
        json.dumps(protected_payload, sort_keys=True).encode("utf-8")
    )
    record, _ = DemographicVaultRecord.objects.update_or_create(
        research_pseudonym=mapping.research_pseudonym,
        defaults={
            "encrypted_payload": encrypted,
            "consent_version": status["current_version"],
            "retention_until": retention_until,
        },
    )
    _audit(actor, "self_write", "allowed", "voluntary_research_response", mapping.research_pseudonym)
    return record


def own_demographic_status(actor):
    if not actor.is_authenticated or actor.role != actor.ROLE_STUDENT:
        raise PermissionDenied("Acceso no autorizado.")
    mapping = ResearchPseudonymMap.objects.filter(participant=actor).first()
    record = None
    if mapping:
        record = DemographicVaultRecord.objects.filter(
            research_pseudonym=mapping.research_pseudonym,
            retention_until__gt=timezone.now(),
        ).first()
    return {
        "registered": record is not None,
        "retention_until": record.retention_until if record else None,
    }


def delete_own_demographics(actor):
    if not actor.is_authenticated or actor.role != actor.ROLE_STUDENT:
        raise PermissionDenied("Acceso no autorizado.")
    mapping = ResearchPseudonymMap.objects.filter(participant=actor).first()
    if not mapping:
        return False
    deleted, _ = DemographicVaultRecord.objects.filter(
        research_pseudonym=mapping.research_pseudonym
    ).delete()
    _audit(
        actor,
        "self_delete",
        "allowed",
        "voluntary_response_withdrawn",
        mapping.research_pseudonym,
    )
    return bool(deleted)
