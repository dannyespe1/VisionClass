from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(path, *needles):
    text = (ROOT / path).read_text(encoding="utf-8")
    for needle in needles:
        if needle not in text:
            raise SystemExit(f"FAIL {path}: falta {needle}")


require("backend/api/models.py", "class ConsentEvent", "Los eventos de consentimiento son inmutables")
require("backend/api/consent.py", "REQUIRED_CAPTURE_PURPOSES", '"teacher_access": False', '"images_stored": False')
require("backend/core/settings.py", "CONSENT_V2_ENABLED", "CONSENT_TEXT_APPROVED", "PENDING-ETHICS-APPROVAL")
require("backend/api/views.py", "has_capture_consent", "class ConsentEventViewSet", "class ConsentStatusView")
require("frontend/app/api/attention-proxy/route.ts", "/api/consents/status/", "capture_allowed")
require("frontend/app/student/CameraPermissionModal.tsx", "PENDIENTE DE APROBACIÓN", "Continuar sin cámara")
require("frontend/app/student/course/[courseId]/page.tsx", "enableCamera", "revokeCaptureConsent")
require("docs/PR07/INFORME.md", "BLOCKED_HUMAN", "solo universitarios adultos")
print("PASS PR07: contrato, cierre seguro, UI alternativa y evidencia presentes")
