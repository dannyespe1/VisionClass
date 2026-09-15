import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Dict, Optional


ALLOWED_FIELDS = {"window_position", "quality", "model_version", "revision"}


@dataclass(frozen=True)
class SessionIdentity:
    participant_id: str
    course_id: str
    session_id: str


class DistributedStateStore:
    def __init__(self, client, namespace: str, key_secret: str, ttl_seconds: int = 3600):
        if len(key_secret) < 32:
            raise ValueError("STATE_KEY_SECRET must contain at least 32 characters")
        if ttl_seconds < 60:
            raise ValueError("STATE_TTL_SECONDS must be at least 60")
        self.client = client
        self.namespace = namespace.rstrip(":")
        self.key_secret = key_secret.encode("utf-8")
        self.ttl_seconds = ttl_seconds

    def key_for(self, identity: SessionIdentity) -> str:
        material = f"{identity.participant_id}\x1f{identity.course_id}\x1f{identity.session_id}".encode("utf-8")
        digest = hmac.new(self.key_secret, material, hashlib.sha256).hexdigest()
        return f"{self.namespace}:{digest}"

    def _encode(self, state: Dict[str, Any]) -> str:
        unknown = set(state) - ALLOWED_FIELDS
        if unknown:
            raise ValueError(f"unsupported state fields: {sorted(unknown)}")
        revision = state.get("revision")
        if isinstance(revision, bool) or not isinstance(revision, int) or revision < 0:
            raise ValueError("revision must be a non-negative integer")
        return json.dumps(state, sort_keys=True, separators=(",", ":"))

    def save(self, identity: SessionIdentity, state: Dict[str, Any]) -> None:
        self.client.set(self.key_for(identity), self._encode(state), ex=self.ttl_seconds)

    def load(self, identity: SessionIdentity, renew_ttl: bool = True) -> Optional[Dict[str, Any]]:
        key = self.key_for(identity)
        raw = self.client.get(key)
        if raw is None:
            return None
        if renew_ttl:
            self.client.expire(key, self.ttl_seconds)
        return json.loads(raw)

    def compare_and_set(self, identity: SessionIdentity, expected_revision: int, state: Dict[str, Any]) -> bool:
        key = self.key_for(identity)
        with self.client.pipeline() as pipe:
            pipe.watch(key)
            current_raw = pipe.get(key)
            current = json.loads(current_raw) if current_raw else {"revision": 0}
            if current.get("revision", 0) != expected_revision:
                pipe.unwatch()
                return False
            if state.get("revision") != expected_revision + 1:
                pipe.unwatch()
                raise ValueError("next revision must increment by one")
            encoded = self._encode(state)
            pipe.multi()
            pipe.set(key, encoded, ex=self.ttl_seconds)
            pipe.execute()
            return True

    def delete(self, identity: SessionIdentity) -> None:
        self.client.delete(self.key_for(identity))
