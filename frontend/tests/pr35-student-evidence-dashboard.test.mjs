import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../app/student/EvidenceDashboardSection.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/student/page.tsx", import.meta.url), "utf8");
const navbar = readFileSync(new URL("../app/student/StudentNavbar.tsx", import.meta.url), "utf8");
const features = readFileSync(new URL("../app/lib/features.ts", import.meta.url), "utf8");

test("student evidence dashboard remains disabled unless explicitly enabled", () => {
  assert.match(features, /NEXT_PUBLIC_STUDENT_ATTENTION_DASHBOARD/);
  assert.match(features, /=== "true"/);
  assert.match(page, /STUDENT_ATTENTION_DASHBOARD_ENABLED \? <EvidenceDashboardSection \/> : <EstadisticasSection \/>/);
  assert.match(navbar, /STUDENT_ATTENTION_DASHBOARD_ENABLED \? "Mi evidencia" : "Estadísticas"/);
});

test("dashboard explains observation, inference, self-report and non-observable states", () => {
  for (const label of ["Observación", "Inferencia técnica", "Autoinforme", "No observable"]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /no mide directamente lo que piensas o aprendes/i);
  assert.match(component, /no tu estado mental/i);
});

test("dashboard provides accessible empty, partial, loading and error states", () => {
  assert.match(component, /dashboard\.state === "empty"/);
  assert.match(component, /session\.partial/);
  assert.match(component, /role="status"/);
  assert.match(component, /role="alert"/);
  assert.match(component, /aria-label={`Cobertura observable/);
  assert.match(component, /aria-live="polite"/);
});

test("dashboard exposes revocation and data policy without rankings or permanent labels", () => {
  assert.match(component, /revokeCaptureConsent/);
  assert.match(component, /Pausar y revocar captura/);
  assert.match(component, /href="\/privacidad"/);
  assert.match(component, /no te compara con otras/);
  assert.match(component, /No asigna una etiqueta permanente/);
});

test("dashboard consumes only the minimized student evidence endpoint", () => {
  assert.match(component, /\/api\/student-evidence-dashboard\//);
  assert.doesNotMatch(component, /student-metrics/);
  assert.doesNotMatch(component, /probabilities|model_reference|features/);
});
