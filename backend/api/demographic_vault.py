import hashlib
import json

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import PermissionDenied

from .models import DemographicVaultAudit, DemographicVaultRecord


ALLOWED_FIELDS = {"age_band", "gender_self_description", "accessibility_accommodation", "voluntary_group"}


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
