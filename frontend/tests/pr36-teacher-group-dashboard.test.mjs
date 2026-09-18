import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../app/instructor/components/TeacherGroupDashboardSection.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/instructor/page.tsx", import.meta.url), "utf8");
const navbar = readFileSync(new URL("../app/instructor/components/InstructorNavbar.tsx", import.meta.url), "utf8");
const features = readFileSync(new URL("../app/lib/features.ts", import.meta.url), "utf8");

test("teacher dashboard remains disabled unless explicitly enabled", () => {
  assert.match(features, /NEXT_PUBLIC_TEACHER_GROUP_DASHBOARD/);
  assert.match(features, /=== "true"/);
  assert.match(page, /TEACHER_GROUP_DASHBOARD_ENABLED \? \(/);
  assert.match(navbar, /TEACHER_GROUP_DASHBOARD_ENABLED \? "Evidencia grupal"/);
});

test("new panel replaces individual legacy analytics when enabled", () => {
  assert.match(page, /<TeacherGroupDashboardSection \/>/);
  assert.match(page, /<EstadisticasProfesor \/>/);
  assert.doesNotMatch(component, /student_id|username|email|Ver perfil|Enviar mensaje/);
});

test("panel exposes coverage uncertainty distribution intervals and trend", () => {
  for (const term of ["Cobertura observable", "Incertidumbre técnica media", "Distribución agregada", "Intervalo descriptivo", "Tendencia semanal"]) {
    assert.match(component, new RegExp(term, "i"));
  }
  assert.match(component, /aria-label={`Cobertura/);
  assert.match(component, /<caption className="sr-only">/);
});

test("panel handles privacy suppression and combined filters", () => {
  assert.match(component, /complementary_period_suppression/);
  assert.match(component, /No se muestran conteos ni métricas parciales/);
  assert.match(component, /new URLSearchParams\(\{ period \}\)/);
  assert.match(component, /params\.set\("course_id", courseId\)/);
  assert.match(component, /minimum_participants/);
  assert.match(component, /minimum_observable_windows/);
});

test("panel avoids rankings diagnoses and individual surveillance language", () => {
  assert.match(component, /no genera rankings/i);
  assert.match(component, /no permite vigilancia individual/i);
  assert.match(component, /no estados mentales/i);
  assert.doesNotMatch(component, /riesgo del estudiante|atención promedio|alerta temprana/i);
});
