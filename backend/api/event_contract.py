from datetime import datetime
from uuid import UUID

from rest_framework import serializers


EVENT_V2_FIELDS = {
    "contract_version", "event_id", "session_type", "session_id", "captured_at",
    "features", "quality", "device", "consent",
}
PURPOSES = {"local_processing", "derived_persistence", "research"}


def validate_attention_event_v2(value):
    if not isinstance(value, dict):
        raise serializers.ValidationError("event_v2 debe ser un objeto.")
    unknown = set(value) - EVENT_V2_FIELDS
    if unknown:
        raise serializers.ValidationError({"unknown_fields": sorted(unknown)})
    required = EVENT_V2_FIELDS - {"device"}
    missing = required - set(value)
    if missing:
        raise serializers.ValidationError({"missing_fields": sorted(missing)})
    if value.get("contract_version") != "2.0":
        raise serializers.ValidationError("contract_version no soportada.")
    try:
        UUID(str(value.get("event_id")))
    except (TypeError, ValueError, AttributeError):
        raise serializers.ValidationError({"event_id": "UUID inválido."})
    if value.get("session_type") not in {"course", "d2r"}:
        raise serializers.ValidationError({"session_type": "Valor no soportado."})
    session_id = value.get("session_id")
    if isinstance(session_id, bool) or not isinstance(session_id, int) or session_id < 1:
        raise serializers.ValidationError({"session_id": "Debe ser un entero positivo."})
    try:
        datetime.fromisoformat(str(value.get("captured_at")).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise serializers.ValidationError({"captured_at": "Fecha ISO-8601 inválida."})
    features = value.get("features")
    if not isinstance(features, dict) or any(
        isinstance(item, bool) or (item is not None and not isinstance(item, (int, float)))
        for item in features.values()
    ):
        raise serializers.ValidationError({"features": "Solo admite números o null."})
    quality = value.get("quality")
    if not isinstance(quality, dict) or set(quality) - {"observable", "confidence", "reason"}:
        raise serializers.ValidationError({"quality": "Estructura inválida."})
    if not isinstance(quality.get("observable"), bool):
        raise serializers.ValidationError({"quality.observable": "Debe ser booleano."})
    confidence = quality.get("confidence")
    if confidence is not None and (
        isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1
    ):
        raise serializers.ValidationError({"quality.confidence": "Debe estar entre 0 y 1 o ser null."})
    consent = value.get("consent")
    if not isinstance(consent, dict) or set(consent) != {"version", "purposes"}:
        raise serializers.ValidationError({"consent": "Estructura inválida."})
    if not isinstance(consent["version"], str) or not consent["version"] or len(consent["version"]) > 64:
        raise serializers.ValidationError({"consent.version": "Versión inválida."})
    purposes = consent["purposes"]
    if not isinstance(purposes, list) or len(purposes) != len(set(purposes)) or not set(purposes) <= PURPOSES:
        raise serializers.ValidationError({"consent.purposes": "Finalidades inválidas o duplicadas."})
    return value
