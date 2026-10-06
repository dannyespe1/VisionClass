import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const render = readFileSync(new URL("../../render.yaml", import.meta.url), "utf8");
const preflight = JSON.parse(
  readFileSync(new URL("../../docs/PILOT_PREFLIGHT/RESULTS.json", import.meta.url), "utf8"),
);

const backendStart = render.indexOf("name: visionclass-backend");
const mlStart = render.indexOf("name: visionclass-ml");
const frontendStart = render.indexOf("name: visionclass-frontend");
const backend = render.slice(backendStart, mlStart);
const frontend = render.slice(frontendStart);

function assertEnv(block, key, expected) {
  assert.match(block, new RegExp(`key: ${key}\\s+value: "${expected}"`));
}

test("Render activates the complete consent-bound Edge shadow path", () => {
  for (const key of [
    "TEMPORAL_SCHEMA_V2",
    "MODEL_REGISTRY",
    "NORMALIZED_FEATURES_V1",
    "QUALITY_GATE_V1",
    "EDGE_SHADOW_REPORTING",
    "OBSERVER_ANNOTATION",
    "RESEARCH_SESSION_CALIBRATION_REQUIRED",
    "PILOT_RELEASE",
    "RESEARCH_DASHBOARD",
  ]) {
    assertEnv(backend, key, "True");
  }
  assert.match(
    backend,
    /preDeployCommand: python manage\.py migrate && python manage\.py register_edge_model_v1 && python manage\.py collectstatic --noinput/,
  );
});

test("Render builds the matching local-only frontend capture path", () => {
  for (const key of [
    "NEXT_PUBLIC_BROWSER_EXTRACTOR",
    "NEXT_PUBLIC_NORMALIZED_FEATURES_V1",
    "NEXT_PUBLIC_QUALITY_GATE_V1",
    "NEXT_PUBLIC_EDGE_PROFILES",
    "NEXT_PUBLIC_PILOT_RELEASE",
    "NEXT_PUBLIC_RESEARCH_DASHBOARD",
    "NEXT_PUBLIC_OBSERVER_ANNOTATION",
    "NEXT_PUBLIC_RESEARCH_SESSION_CALIBRATION_REQUIRED",
    "NEXT_PUBLIC_MASKED_GRU_SHADOW",
    "NEXT_PUBLIC_EDGE_SHADOW_REPORTING",
  ]) {
    assertEnv(frontend, key, "true");
  }
});

test("individual inference panels and interventions remain disabled", () => {
  for (const key of [
    "STUDENT_ATTENTION_DASHBOARD",
    "TEACHER_GROUP_DASHBOARD",
    "CONSERVATIVE_INTERVENTIONS",
  ]) {
    assertEnv(backend, key, "False");
  }
  for (const key of [
    "NEXT_PUBLIC_STUDENT_ATTENTION_DASHBOARD",
    "NEXT_PUBLIC_TEACHER_GROUP_DASHBOARD",
    "NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS",
  ]) {
    assertEnv(frontend, key, "false");
  }
  assert.equal(preflight.status, "AUTOMATED_AND_MANUAL_PASS");
  assert.equal(preflight.manual_camera_and_dual_observer_journey, "PASS");
  assert.equal(preflight.render_pilot_evidence.raw_media_transmission_authorized, false);
});
