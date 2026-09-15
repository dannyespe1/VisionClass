import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


queue = read("frontend/app/lib/bounded-capture-queue.mjs")
course = read("frontend/app/student/course/[courseId]/page.tsx")
d2r = read("frontend/app/d2r/page.tsx")
proxy = read("frontend/app/api/attention-proxy/route.ts")
ml = read("ml/ml_service.py")
ml_env = read("ml/.env.example")
report = read("docs/PR05/INFORME.md")
verification = json.loads(read("docs/PR05/VERIFICACION.json"))

required = {
    "queue active slot": "this.active",
    "queue pending slot": "this.pending",
    "replacement counter": "this.stats.replaced",
    "deadline abort": 'controller.abort("deadline_exceeded")',
    "course integration": "captureQueueRef.current",
    "D2R integration": "new BoundedCaptureQueue",
    "idempotency propagation": 'req.headers.get("idempotency-key")',
    "ML size limit": "MAX_FRAME_BYTES + 1",
}
haystacks = "\n".join((queue, course, d2r, proxy, ml))
for label, fragment in required.items():
    if fragment not in haystacks:
        raise SystemExit(f"Falta {label}: {fragment}")
for forbidden in ("SAVE_FRAMES", "FRAMES_DIR"):
    if forbidden in ml or forbidden in ml_env:
        raise SystemExit(f"Persistencia visual heredada activa: {forbidden}")
if verification["limits"]["active_frames"] != 1 or verification["limits"]["pending_frames"] != 1:
    raise SystemExit("Capacidad documentada inválida")
if verification["g0"] != "BLOCKED" or verification["participants_authorized"] != 0:
    raise SystemExit("PR05 no conserva el bloqueo de G0")
if "G0 continúa `BLOQUEADA`" not in report:
    raise SystemExit("Informe PR05 no declara G0")

print("PR05 verification: PASS (technical candidate; G0 blocked)")
