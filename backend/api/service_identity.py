import hmac
import logging
import re
from dataclasses import dataclass

from django.conf import settings
from rest_framework.exceptions import APIException, PermissionDenied


logger = logging.getLogger("visionclass.security")
SERVICE_TOKEN_PATTERN = re.compile(r"^Service ([^\s]+)$")


class ServiceAuthenticationFailed(APIException):
    status_code = 401
    default_detail = "Identidad de servicio no válida."
    default_code = "service_authentication_failed"


@dataclass(frozen=True)
class ServicePrincipal:
    name: str
    key_slot: str
    scopes: frozenset[str]


def _configured_scopes() -> frozenset[str]:
    value = getattr(settings, "ML_SERVICE_SCOPES", ("events:write",))
    if isinstance(value, str):
        value = value.split(",")
    return frozenset(scope.strip() for scope in value if scope.strip())


def _deny(reason: str, *, forbidden: bool = False):
    logger.warning(
        "security_event action=ml_service_auth outcome=denied reason=%s",
        reason,
    )
    if forbidden:
        raise PermissionDenied("La identidad de servicio no tiene el scope requerido.")
    raise ServiceAuthenticationFailed()


def authenticate_ml_service(request, required_scope: str) -> ServicePrincipal:
    if not getattr(settings, "ML_SERVICE_IDENTITY", True):
        _deny("identity_feature_disabled")

    match = SERVICE_TOKEN_PATTERN.fullmatch(request.headers.get("Authorization", "").strip())
    if not match:
        _deny("missing_service_credential")
    presented = match.group(1)
    if len(presented) < 32:
        _deny("invalid_service_credential")

    candidates = (
        ("current", getattr(settings, "ML_SERVICE_TOKEN", "")),
        ("previous", getattr(settings, "ML_SERVICE_PREVIOUS_TOKEN", "")),
    )
    key_slot = next(
        (
            slot
            for slot, configured in candidates
            if configured and hmac.compare_digest(presented, configured)
        ),
        None,
    )
    if key_slot is None:
        _deny("invalid_or_revoked_service_credential")

    scopes = _configured_scopes()
    if required_scope not in scopes:
        _deny("missing_required_scope", forbidden=True)

    return ServicePrincipal(
        name=getattr(settings, "ML_SERVICE_NAME", "visionclass-ml"),
        key_slot=key_slot,
        scopes=scopes,
    )
