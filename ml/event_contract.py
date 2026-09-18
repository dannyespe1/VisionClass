from datetime import datetime
from uuid import UUID


FIELDS = {
    "contract_version", "event_id", "session_type", "session_id", "captured_at",
    "features", "quality", "device", "consent",
}
PURPOSES = {"local_processing", "derived_persistence", "research"}


def validate_attention_event_v2(value):
    if not isinstance(value, dict):
        raise ValueError("event_v2.object")
    if set(value) - FIELDS:
        raise ValueError("event_v2.unknown_fields")
    if FIELDS - {"device"} - set(value):
        raise ValueError("event_v2.missing_fields")
    if value.get("contract_version") != "2.0":
        raise ValueError("event_v2.contract_version")
    try:
        UUID(str(value.get("event_id")))
        datetime.fromisoformat(str(value.get("captured_at")).replace("Z", "+00:00"))
    except (TypeError, ValueError, AttributeError) as exc:
        raise ValueError("event_v2.identity_or_time") from exc
    if value.get("session_type") != "course":
        raise ValueError("event_v2.session_type")
    session_id = value.get("session_id")
    if isinstance(session_id, bool) or not isinstance(session_id, int) or session_id < 1:
        raise ValueError("event_v2.session_id")
    features = value.get("features")
    if not isinstance(features, dict) or any(
        isinstance(item, bool) or (item is not None and not isinstance(item, (int, float)))
        for item in features.values()
    ):
        raise ValueError("event_v2.features")
    quality = value.get("quality")
    confidence = quality.get("confidence") if isinstance(quality, dict) else "invalid"
    if not isinstance(quality, dict) or not isinstance(quality.get("observable"), bool):
        raise ValueError("event_v2.quality")
    if confidence is not None and (
        isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1
    ):
        raise ValueError("event_v2.quality_confidence")
    consent = value.get("consent")
    if not isinstance(consent, dict) or set(consent) != {"version", "purposes"}:
        raise ValueError("event_v2.consent")
    purposes = consent.get("purposes")
    if not consent.get("version") or not isinstance(purposes, list) or len(purposes) != len(set(purposes)) or not set(purposes) <= PURPOSES:
        raise ValueError("event_v2.consent_values")
    return value
