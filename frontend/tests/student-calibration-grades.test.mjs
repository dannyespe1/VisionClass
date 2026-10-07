import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coursePage = await readFile(new URL("../app/student/course/[courseId]/page.tsx", import.meta.url), "utf8");
const calibrationScreen = await readFile(new URL("../app/student/course/[courseId]/OcularCalibrationScreen.tsx", import.meta.url), "utf8");
const permissionModal = await readFile(new URL("../app/student/CameraPermissionModal.tsx", import.meta.url), "utf8");
const instructorPage = await readFile(new URL("../app/instructor/page.tsx", import.meta.url), "utf8");
const gradeReport = await readFile(new URL("../app/instructor/components/GradeReportSection.tsx", import.meta.url), "utf8");

test("course waits for the separate calibration flow before recording content", () => {
  assert.match(coursePage, /const \[permissionOpen, setPermissionOpen\] = useState\(true\)/);
  assert.match(coursePage, /!courseReady \|\| permissionOpen \|\| ocularCalibrationOpen/);
  assert.match(coursePage, /<OcularCalibrationScreen/);
  assert.match(calibrationScreen, /Paso previo al curso/);
  assert.match(calibrationScreen, /Iniciar curso/);
  assert.match(calibrationScreen, /Continuar sin cámara/);
  assert.match(calibrationScreen, /Objetivo visual/);
  assert.match(coursePage, /RESEARCH_SESSION_CALIBRATION_REQUIRED/);
  assert.match(coursePage, /\/api\/research-calibrations\//);
  assert.match(coursePage, /const courseAccessReady = !RESEARCH_SESSION_CALIBRATION_REQUIRED \|\| courseReady/);
  assert.match(coursePage, /data-testid="course-access-gate"/);
  assert.match(coursePage, /\{courseAccessReady \? \(/);
});

test("slow or missing session cannot close permissions or expose the course", () => {
  const sessionGuard = coursePage.indexOf("RESEARCH_SESSION_CALIBRATION_REQUIRED && !sessionId");
  const firstPermissionCloseAfterRequest = coursePage.indexOf("setPermissionOpen(false)", coursePage.indexOf("const requestCamera"));
  assert.notEqual(sessionGuard, -1);
  assert.notEqual(firstPermissionCloseAfterRequest, -1);
  assert.ok(sessionGuard < firstPermissionCloseAfterRequest, "the secure-session guard must run before closing permissions");
  assert.match(coursePage, /setPermissionOpen\(true\);\s+setCameraError\(sessionPreparing/);
  assert.match(coursePage, /setCourseReady\(false\);\s+setOcularCalibrationOpen\(false\);\s+setPermissionOpen\(true\)/);
  assert.match(coursePage, /sessionReady=\{sessionId !== null\}/);
  assert.match(permissionModal, /researchSessionRequired && \(!researchUse \|\| !sessionReady\)/);
  assert.match(permissionModal, /Preparando sesión…/);
});

test("student course does not expose live attention or model diagnostics", () => {
  for (const label of ["Atención:", "Modelo GRU en prueba", "Análisis de Atención en Tiempo Real", "Concentración promedio", 'data-testid="ocular-local-validation"']) {
    assert.equal(coursePage.includes(label), false, `${label} must not be shown in the course page`);
  }
});

test("calibration communicates local processing and avoids raw visual persistence", () => {
  assert.match(calibrationScreen, /no se guardan ni transmiten imágenes, video, landmarks o muestras individuales/i);
  assert.match(calibrationScreen, /disabled={!ready \|\| submitting}/);
});

test("calibration uses an immersive viewport with widely separated automatic targets", () => {
  assert.match(calibrationScreen, /h-\[100dvh\]/);
  assert.match(calibrationScreen, /left-\[12vw\]/);
  assert.match(calibrationScreen, /left-\[88vw\]/);
  assert.match(calibrationScreen, /document\.body\.style\.overflow = "hidden"/);
  assert.equal(calibrationScreen.includes("onClick={() => onSelectPhase(item.id)}"), false);
});

test("calibration is reused only for the same context and a server-accepted proof", () => {
  assert.match(coursePage, /calibratedContextRef\.current\?\.courseId === courseId/);
  assert.match(coursePage, /calibratedContextRef\.current\?\.cameraId === resolvedCameraId/);
  assert.match(coursePage, /calibrationStillValid/);
  assert.match(coursePage, /calibrationCameraIdRef\.current \|\| selectedCameraId/);
  assert.match(coursePage, /readOcularCalibrationReuse/);
  assert.match(coursePage, /\/api\/research-calibrations\/reuse\//);
  assert.match(coursePage, /writeOcularCalibrationReuse/);
  assert.match(coursePage, /clearOcularCalibrationReuse/);
  assert.match(coursePage, /reused\.ready/);
  assert.match(coursePage, /confirmed\.ready/);
  assert.match(coursePage, /calibration_version !== OCULAR_CALIBRATION_VERSION/);
  assert.match(coursePage, /Calibración anterior verificada por el servidor y reutilizada/);
  assert.match(coursePage, /setCourseReady\(false\);\s+setOcularCalibrationOpen\(false\);\s+setPermissionOpen\(true\)/);
});

test("quiz attempts preserve the material needed to group grades by module", () => {
  assert.match(coursePage, /\/api\/course-materials\/\$\{currentMaterial\.id\}\/submit\//);
});

test("teacher statistics expose grades grouped by module and evaluation", () => {
  assert.match(instructorPage, /<GradeReportSection \/>/);
  for (const heading of ["Estudiante", "Promedio", "Evaluaciones anteriores", "intento más reciente"]) {
    assert.match(gradeReport, new RegExp(heading));
  }
  assert.match(gradeReport, /\/api\/quiz-attempts\//);
  assert.match(gradeReport, /attempt\.material\?\.lesson\.module/);
  assert.match(gradeReport, /cell\.attempts > 1/);
});
