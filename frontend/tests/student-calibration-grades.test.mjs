import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coursePage = await readFile(new URL("../app/student/course/[courseId]/page.tsx", import.meta.url), "utf8");
const calibrationModal = await readFile(new URL("../app/student/course/[courseId]/OcularCalibrationModal.tsx", import.meta.url), "utf8");
const instructorPage = await readFile(new URL("../app/instructor/page.tsx", import.meta.url), "utf8");
const gradeReport = await readFile(new URL("../app/instructor/components/GradeReportSection.tsx", import.meta.url), "utf8");

test("course waits for the separate calibration flow before recording content", () => {
  assert.match(coursePage, /const \[permissionOpen, setPermissionOpen\] = useState\(true\)/);
  assert.match(coursePage, /!courseReady \|\| permissionOpen \|\| ocularCalibrationOpen/);
  assert.match(coursePage, /<OcularCalibrationModal/);
  assert.match(calibrationModal, /Paso previo al curso/);
  assert.match(calibrationModal, /Iniciar curso/);
  assert.match(calibrationModal, /Continuar sin cámara/);
});

test("student course does not expose live attention or model diagnostics", () => {
  for (const label of ["Atención:", "Modelo GRU en prueba", "Análisis de Atención en Tiempo Real", "Concentración promedio", 'data-testid="ocular-local-validation"']) {
    assert.equal(coursePage.includes(label), false, `${label} must not be shown in the course page`);
  }
});

test("calibration communicates local processing and avoids raw visual persistence", () => {
  assert.match(calibrationModal, /No se guardan ni transmiten imágenes, video, landmarks o muestras individuales/);
  assert.match(calibrationModal, /disabled={!ready}/);
});

test("calibration is reused only for the same course and camera", () => {
  assert.match(coursePage, /calibratedContextRef\.current\?\.courseId === courseId/);
  assert.match(coursePage, /calibratedContextRef\.current\?\.cameraId === resolvedCameraId/);
  assert.match(coursePage, /calibrationStillValid/);
  assert.match(coursePage, /calibrationCameraIdRef\.current \|\| selectedCameraId/);
});

test("quiz attempts preserve the material needed to group grades by module", () => {
  assert.match(coursePage, /material_id: currentMaterial\.id/);
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
