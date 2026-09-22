import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  MaskedGRUShadowEngine,
  SafeMaskedGRUShadowFallback,
  loadMaskedGRUShadow,
} from "../app/lib/masked-gru-shadow.mjs";
import { adaptMediaPipeDetection } from "../app/lib/mediapipe-face-detector.mjs";
import { summarizeDetectedFace } from "../app/lib/browser-feature-extractor.mjs";
import { evaluateWindow } from "../app/lib/quality-gate.mjs";

const artifactBytes = await readFile(new URL("../public/models/masked-gru-observable-evidence-v1-synthetic.json", import.meta.url));
const artifact = JSON.parse(artifactBytes.toString("utf8"));
const manifest = JSON.parse(await readFile(new URL("../public/models/masked-gru-observable-evidence-v1-synthetic.manifest.json", import.meta.url), "utf8"));

const event = (overrides = {}) => ({
  captured_at: "2026-09-18T15:00:00.000Z",
  device: { preprocessing_version: "normalized-features-v1" },
  quality: { observable: true },
  features: {
    face_center_x: 0.5,
    face_center_y: 0.46,
    face_width: 0.33,
    face_height: 0.5,
    eye_span: 0.2,
    head_roll: 0.06,
    gaze_horizontal_proxy: 0.53,
    pose_available: 1,
    gaze_available: 1,
    profile_generation: 1,
  },
  ...overrides,
});

function fetchFor(bytes = artifactBytes, manifestValue = manifest) {
  return async (url) => url.endsWith(".manifest.json")
    ? { ok: true, async json() { return structuredClone(manifestValue); } }
    : { ok: true, async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); } };
}

test("matches the Python reference probability for the first synthetic window", () => {
  const engine = new MaskedGRUShadowEngine(artifact);
  const result = engine.update(event());
  assert.ok(Math.abs(result.probability - 0.9938762784004211) < 1e-6);
  assert.equal(result.evidence_state, "task_oriented_evidence");
  assert.equal(result.mode, "shadow_only");
  assert.equal(result.allow_intervention, false);
});

test("no observable resets state and never becomes a negative decision", () => {
  const engine = new MaskedGRUShadowEngine(artifact);
  engine.update(event());
  const result = engine.update(event({
    captured_at: "2026-09-18T15:00:05.000Z",
    quality: { observable: false },
  }));
  assert.equal(result.probability, null);
  assert.equal(result.evidence_state, "no_observable");
  assert.equal(result.allow_intervention, false);
});

test("loads same-origin bytes only after manifest integrity validation", async () => {
  const loaded = await loadMaskedGRUShadow({
    enabled: true,
    origin: "https://visionclass.test",
    fetchImpl: fetchFor(),
    cryptoImpl: webcrypto,
  });
  assert.equal(loaded.status, "ready");
  assert.equal(loaded.engine.update(event()).execution_location, "local_device");
});

test("tampering and cross-origin URLs fail closed", async () => {
  const tampered = Buffer.from(artifactBytes);
  tampered[tampered.length - 2] = tampered[tampered.length - 2] === 32 ? 33 : 32;
  const hashFailure = await loadMaskedGRUShadow({
    enabled: true,
    origin: "https://visionclass.test",
    fetchImpl: fetchFor(tampered),
    cryptoImpl: webcrypto,
  });
  assert.equal(hashFailure.status, "fallback");
  assert.equal(hashFailure.reason, "artifact_hash_mismatch");
  assert.equal(hashFailure.engine.update().evidence_state, "no_observable");

  let calls = 0;
  const crossOrigin = await loadMaskedGRUShadow({
    enabled: true,
    artifactUrl: "https://attacker.test/model.json",
    origin: "https://visionclass.test",
    fetchImpl: async () => { calls += 1; throw new Error("must_not_fetch"); },
  });
  assert.equal(crossOrigin.status, "fallback");
  assert.equal(crossOrigin.reason, "cross_origin_artifact_rejected");
  assert.equal(calls, 0);
});

test("safe fallback remains isolated", () => {
  const result = new SafeMaskedGRUShadowFallback("controlled_failure").update();
  assert.equal(result.evidence_state, "no_observable");
  assert.equal(result.active, false);
  assert.equal(result.allow_intervention, false);
});

test("unlabeled MediaPipe keypoints cross the quality gate and reach shadow inference", () => {
  const face = adaptMediaPipeDetection({
    boundingBox: { originX: 120, originY: 80, width: 300, height: 300 },
    keypoints: [
      { x: 0.62, y: 0.40 },
      { x: 0.38, y: 0.39 },
      { x: 0.50, y: 0.52 },
      { x: 0.50, y: 0.64 },
      { x: 0.30, y: 0.50 },
      { x: 0.70, y: 0.50 },
    ],
    categories: [{ score: 0.95 }],
  }, 640, 480);
  const features = {
    ...summarizeDetectedFace(face, 640, 480),
    luminance_mean: 0.6,
  };
  const samples = [0, 1, 2].map((offset) => ({
    captured_at: `2026-09-18T15:00:0${offset}.000Z`,
    features,
    quality: { observable: true, confidence: face.confidence },
  }));
  const quality = evaluateWindow(samples);
  assert.equal(quality.allow_inference, true);

  const result = new MaskedGRUShadowEngine(artifact).update(event({
    quality,
    features: {
      face_center_x: features.face_center_x,
      face_center_y: features.face_center_y,
      face_width: features.face_width,
      face_height: features.face_height,
      eye_span: features.eye_span,
      head_roll: features.head_roll,
      gaze_horizontal_proxy: features.gaze_horizontal_proxy,
      pose_available: features.pose_available,
      gaze_available: features.gaze_available,
      profile_generation: 1,
    },
  }));
  assert.equal(result.evidence_state === "no_observable", false);
  assert.equal(Number.isFinite(result.probability), true);
  assert.equal(result.mode, "shadow_only");
  assert.equal(result.allow_intervention, false);
});
