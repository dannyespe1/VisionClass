import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFrame, evaluateWindow, QUALITY_MESSAGES } from "../app/lib/quality-gate.mjs";

const sample = (at, overrides = {}) => ({
  captured_at: at,
  features: { face_present: 1, luminance_mean: 0.6, face_edge_margin: 0.1, pose_available: 1, gaze_available: 1, detection_confidence: 0.8, ...overrides.features },
  quality: { observable: true, confidence: 0.8, ...overrides.quality },
});

test("distinguishes darkness absence occlusion and partial face", () => {
  assert.equal(evaluateFrame(sample("2026-09-15T12:00:00Z", { features: { luminance_mean: 0.05 } })).reason, "low_illumination");
  assert.equal(evaluateFrame(sample("2026-09-15T12:00:00Z", { features: { face_present: 0 } })).reason, "face_absent");
  assert.equal(evaluateFrame(sample("2026-09-15T12:00:00Z", { features: { pose_available: 0, gaze_available: 0 } })).reason, "occluded");
  assert.equal(evaluateFrame(sample("2026-09-15T12:00:00Z", { features: { face_edge_margin: 0.005 } })).reason, "partial_face");
});

test("blocks inference for too few frames and temporal gaps", () => {
  assert.equal(evaluateWindow([sample("2026-09-15T12:00:00Z")]).reason, "insufficient_data");
  const gap = evaluateWindow([
    sample("2026-09-15T12:00:00Z"), sample("2026-09-15T12:00:01Z"), sample("2026-09-15T12:00:05Z"),
  ]);
  assert.equal(gap.reason, "frame_loss");
  assert.equal(gap.allow_inference, false);
  assert.equal(gap.allow_intervention, false);
});

test("allows only a continuous mostly observable window", () => {
  const result = evaluateWindow([
    sample("2026-09-15T12:00:00Z"), sample("2026-09-15T12:00:01Z"), sample("2026-09-15T12:00:02Z"),
  ]);
  assert.equal(result.allow_inference, true);
  assert.equal(result.allow_intervention, false);
  assert.equal(result.observable_ratio, 1);
});

test("exposes non-blaming explanations for every blocking reason", () => {
  for (const message of Object.values(QUALITY_MESSAGES)) assert.ok(message.length > 20);
  assert.match(QUALITY_MESSAGES.face_absent, /puedes continuar/);
});
