"""Verifica invariantes estáticos de identidad estricta de PR03."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(path, tokens):
    text = (ROOT / path).read_text(encoding="utf-8")
    missing = [token for token in tokens if token not in text]
    if missing:
        raise SystemExit(f"{path}: faltan {missing}")


require("backend/core/settings.py", ("STRICT_EVENT_IDENTITY", "EVENT_SESSION_MAX_AGE_MINUTES"))
require("backend/api/models.py", ("SecurityAuditEvent", "uniq_attention_event_idempotency"))
require("backend/api/views.py", ("claimed_user_mismatch", "session_owner_mismatch", "session_expired", "event_replay"))
require("frontend/app/api/attention-proxy/route.ts", ("Identidad discordante", "Sesión no autorizada", "crypto.randomUUID()"))
require("ml/ml_service.py", ('"Idempotency-Key"', "authorization=authorization"))
require("docs/PR03/INFORME.md", ("G0 continúa `BLOQUEADA`", "Rollback seguro"))

serializers = (ROOT / "backend/api/serializers.py").read_text(encoding="utf-8")
for class_name in ("AttentionEventSerializer", "ContentViewSerializer", "QuizAttemptSerializer"):
    start = serializers.index(f"class {class_name}")
    end = serializers.find("\nclass ", start + 1)
    block = serializers[start:] if end == -1 else serializers[start:end]
    if "source='user'" in block:
        raise SystemExit(f"{class_name} todavía confía en user_id como relación")

print("PR03: identidad derivada, sesiones validadas, replay controlado y auditoría mínima")
