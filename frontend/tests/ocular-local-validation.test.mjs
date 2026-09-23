import assert from "node:assert/strict";
import test from "node:test";
import { OcularLocalValidationSession } from "../app/lib/ocular-local-validation.mjs";

const sample = (gazeX, gazeY = 0.5) => ({
  iris_available: 1,
  binocular_gaze_x: gazeX,
  binocular_gaze_y: gazeY,
  eye_openness: 0.8,
  iris_agreement: 0.9,
});

test("retains only aggregate ocular metrics per explicit local phase", () => {
  const session = new OcularLocalValidationSession();
  session.record(sample(0.4));
  session.record(sample(0.6));
  session.selectPhase("eyes_left");
  const result = session.record(sample(0.2, 0.45));
  assert.equal(result.total_samples, 3);
  assert.equal(result.phases.frontal.sample_count, 2);
  assert.equal(result.phases.frontal.binocular_gaze_x.mean, 0.5);
  assert.equal(result.phases.frontal.binocular_gaze_x.min, 0.4);
  assert.equal(result.phases.frontal.binocular_gaze_x.max, 0.6);
  assert.equal(result.phases.eyes_left.binocular_gaze_x.mean, 0.2);
  assert.equal(result.raw_landmarks_retained, false);
  assert.equal(Object.hasOwn(result, "samples"), false);
});

test("ignores incomplete and out-of-range iris samples", () => {
  const session = new OcularLocalValidationSession();
  session.record({ ...sample(0.5), iris_available: 0 });
  session.record({ ...sample(0.5), binocular_gaze_y: 2 });
  assert.equal(session.snapshot().total_samples, 0);
});

test("reset clears values only when a new camera run begins", () => {
  const session = new OcularLocalValidationSession();
  session.record(sample(0.5));
  const retained = session.snapshot();
  assert.equal(retained.total_samples, 1);
  session.reset();
  assert.equal(session.snapshot().total_samples, 0);
  assert.equal(session.snapshot().active_phase, "frontal");
});
