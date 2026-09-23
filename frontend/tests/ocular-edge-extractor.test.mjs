import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { EdgeExecutionBenchmark, selectEdgeExecutionLane } from "../app/lib/edge-execution-benchmark.mjs";
import { summarizeFaceLandmarks } from "../app/lib/mediapipe-face-landmarker.mjs";
import { buildLocalOcularVector, OCULAR_FEATURE_NAMES } from "../app/lib/ocular-feature-contract.mjs";
import { summarizeDetectedFace } from "../app/lib/browser-feature-extractor.mjs";
import { buildNormalizedEvent } from "../app/lib/feature-normalization.mjs";

const landmarkFixture = ({ irisOffsetX = 0, irisOffsetY = 0 } = {}) => {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[1] = { x: 0.5, y: 0.52, z: 0 };
  points[152] = { x: 0.5, y: 0.82, z: 0 };
  points[33] = { x: 0.25, y: 0.4, z: 0 };
  points[133] = { x: 0.42, y: 0.4, z: 0 };
  points[159] = { x: 0.335, y: 0.38, z: 0 };
  points[145] = { x: 0.335, y: 0.42, z: 0 };
  points[362] = { x: 0.58, y: 0.4, z: 0 };
  points[263] = { x: 0.75, y: 0.4, z: 0 };
  points[386] = { x: 0.665, y: 0.38, z: 0 };
  points[374] = { x: 0.665, y: 0.42, z: 0 };
  for (const index of [468, 469, 470, 471, 472]) points[index] = { x: 0.335 + irisOffsetX, y: 0.4 + irisOffsetY, z: 0 };
  for (const index of [473, 474, 475, 476, 477]) points[index] = { x: 0.665 + irisOffsetX, y: 0.4 + irisOffsetY, z: 0 };
  return points;
};

test("derives normalized binocular iris features without returning raw landmarks", () => {
  const result = summarizeFaceLandmarks(landmarkFixture(), 640, 480);
  assert.equal(result.ocular.iris_available, 1);
  assert.ok(Math.abs(result.ocular.binocular_gaze_x - 0.5) < 0.001);
  assert.ok(Math.abs(result.ocular.binocular_gaze_y - 0.5) < 0.001);
  assert.equal(result.ocular.iris_agreement, 1);
  assert.equal(Object.hasOwn(result.ocular, "landmarks"), false);
});

test("separates eye movement from the unchanged head-yaw proxy", () => {
  const neutral = summarizeFaceLandmarks(landmarkFixture(), 640, 480);
  const shifted = summarizeFaceLandmarks(landmarkFixture({ irisOffsetX: 0.04 }), 640, 480);
  assert.ok(shifted.ocular.binocular_gaze_x > neutral.ocular.binocular_gaze_x + 0.2);
  assert.equal(shifted.ocular.head_yaw_proxy, neutral.ocular.head_yaw_proxy);
});

test("fails closed when the 478-point iris contract is incomplete", () => {
  assert.equal(summarizeFaceLandmarks(Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 })), 640, 480), null);
});

test("materializes a 15-value local-only ocular v2 contract", () => {
  const face = summarizeFaceLandmarks(landmarkFixture(), 640, 480);
  const features = summarizeDetectedFace(face, 640, 480);
  const result = buildLocalOcularVector({ features, quality: { ocular_observable: true } });
  assert.equal(result.observable, true);
  assert.equal(result.vector.length, 15);
  assert.equal(result.vector.length, OCULAR_FEATURE_NAMES.length);
});

test("ocular v2 contract abstains for closed eyes instead of assigning a negative class", () => {
  const face = summarizeFaceLandmarks(landmarkFixture(), 640, 480);
  const features = { ...summarizeDetectedFace(face, 640, 480), eye_openness: 0.1 };
  const result = buildLocalOcularVector({ features, quality: { ocular_observable: true } });
  assert.deepEqual(result, { observable: false, reason: "eyes_closed", vector: null });
});

test("v1 network event excludes iris coordinates and keeps the ocular contract local", () => {
  const face = summarizeFaceLandmarks(landmarkFixture(), 640, 480);
  const features = summarizeDetectedFace(face, 640, 480);
  const event = buildNormalizedEvent({
    extractor_version: "ocular-test",
    captured_at: "2026-09-22T12:00:02.000Z",
    features,
    quality: { observable: true, ocular_observable: true, confidence: null, reason: null },
  }, {
    eventId: "00000000-0000-4000-8000-000000000001",
    sessionId: 1,
    consentVersion: "test-consent",
    purposes: ["local_processing"],
  });
  assert.equal(event.device.preprocessing_version, "normalized-features-v1");
  assert.equal(Object.hasOwn(event.features, "left_iris_x"), false);
  assert.equal(Object.hasOwn(event.features, "binocular_gaze_x"), false);
});

test("selects worker only when it protects the main thread without losing coverage", () => {
  assert.equal(selectEdgeExecutionLane({ lanes: {
    main: { samples: 6, total_ms_p95: 40, main_thread_ms_p95: 40, coverage: 1 },
    worker: { samples: 6, total_ms_p95: 55, main_thread_ms_p95: 5, coverage: 1 },
  } }), "worker");
  assert.equal(selectEdgeExecutionLane({ lanes: {
    main: { samples: 6, total_ms_p95: 40, main_thread_ms_p95: 40, coverage: 1 },
    worker: { samples: 6, total_ms_p95: 100, main_thread_ms_p95: 5, coverage: 0.8 },
  } }), "main");
});

test("benchmarks both lanes before freezing the local decision", () => {
  const benchmark = new EdgeExecutionBenchmark({ samplesPerLane: 2 });
  for (let index = 0; index < 4; index += 1) {
    const lane = benchmark.nextLane();
    benchmark.record(lane, lane === "main"
      ? { totalMs: 45, mainThreadMs: 45, observable: true }
      : { totalMs: 50, mainThreadMs: 4, observable: true });
  }
  assert.equal(benchmark.summary().selected_lane, "worker");
  assert.equal(benchmark.nextLane(), "worker");
});

test("worker path transfers frames locally and never performs network or serialization", async () => {
  const source = await readFile(new URL("../app/lib/mediapipe-face-landmarker.worker.mjs", import.meta.url), "utf8");
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("toBlob("), false);
  assert.equal(source.includes("XMLHttpRequest"), false);
  assert.match(source, /bitmap\.close/);
});
