import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(path, fragment):
    text = (ROOT / path).read_text(encoding="utf-8")
    if fragment not in text:
        raise SystemExit(f"Falta {fragment!r} en {path}")
    return text


backend_identity = require("backend/api/service_identity.py", "hmac.compare_digest")
service_view = require("backend/api/service_views.py", 'authenticate_ml_service(request, "events:write")')
ml_identity = require("ml/service_identity.py", "missing_required_scope")
ml_service = require("ml/ml_service.py", 'require_service_scope(authorization, "frames:analyze")')
proxy = require("frontend/app/api/attention-proxy/route.ts", "ML_BFF_SERVICE_TOKEN")
command = require("backend/api/management/commands/create_ml_service_user.py", "Retirado por PR04")
report = require("docs/PR04/INFORME.md", "G0 continúa `BLOQUEADA`")

for forbidden in ("BACKEND_TOKEN", "ML_SERVICE_ROLE=admin"):
    if forbidden in ml_service or forbidden in command:
        raise SystemExit(f"Referencia heredada prohibida: {forbidden}")
if 'headers: { Authorization: `Service ${ML_BFF_SERVICE_TOKEN}` }' not in proxy:
    raise SystemExit("El enlace BFF→ML no usa la identidad de servicio")
if '"user_id"' not in service_view or "claimed_user_not_allowed" not in service_view:
    raise SystemExit("El endpoint ML no rechaza identidad reclamada")

verification = json.loads((ROOT / "docs/PR04/VERIFICACION.json").read_text(encoding="utf-8"))
if verification["g0"] != "BLOCKED" or verification["participants_authorized"] != 0:
    raise SystemExit("PR04 no conserva el bloqueo de G0")

print("PR04 verification: PASS (technical candidate; G0 blocked)")
