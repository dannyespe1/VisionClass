import hmac
from dataclasses import dataclass
from typing import Iterable, Optional


@dataclass(frozen=True)
class ServiceIdentityConfig:
    enabled: bool
    current_token: str
    previous_token: str
    scopes: frozenset[str]

    @classmethod
    def build(
        cls,
        *,
        enabled: bool,
        current_token: str,
        previous_token: str = "",
        scopes: Iterable[str] = (),
    ):
        return cls(
            enabled=enabled,
            current_token=current_token.strip(),
            previous_token=previous_token.strip(),
            scopes=frozenset(scope.strip() for scope in scopes if scope.strip()),
        )


class ServiceIdentityError(Exception):
    def __init__(self, reason: str, status_code: int):
        super().__init__(reason)
        self.reason = reason
        self.status_code = status_code


def authorize_service(
    authorization: Optional[str],
    required_scope: str,
    config: ServiceIdentityConfig,
) -> str:
    if not config.enabled:
        raise ServiceIdentityError("identity_feature_disabled", 503)
    prefix = "Service "
    if not authorization or not authorization.startswith(prefix):
        raise ServiceIdentityError("missing_service_credential", 401)
    presented = authorization[len(prefix):]
    if len(presented) < 32:
        raise ServiceIdentityError("invalid_service_credential", 401)

    key_slot = None
    if config.current_token and hmac.compare_digest(presented, config.current_token):
        key_slot = "current"
    elif config.previous_token and hmac.compare_digest(presented, config.previous_token):
        key_slot = "previous"
    if key_slot is None:
        raise ServiceIdentityError("invalid_or_revoked_service_credential", 401)
    if required_scope not in config.scopes:
        raise ServiceIdentityError("missing_required_scope", 403)
    return key_slot
