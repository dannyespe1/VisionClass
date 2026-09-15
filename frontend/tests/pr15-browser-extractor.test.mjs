import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { BrowserFeatureExtractor, cameraConstraints, summarizeDetectedFace } from "../app/lib/browser-feature-extractor.mjs";

const face = {
  boundingBox: { x: 160, y: 120, width: 320, height: 240 },
  landmarks: [
    { type: "leftEye", locations: [{ x: 260, y: 220 }] },
    { type: "rightEye", locations: [{ x: 380, y: 220 }] },
    { type: "nose", locations: [{ x: 320, y: 270 }] },
  ],
};

test("summarizes geometry as numeric features without pixels or blobs", () => {
  const features = summarizeDetectedFace(face, 640, 480);
  assert.equal(features.face_center_x, 0.5);
  assert.equal(features.face_center_y, 0.5);
  assert.equal(features.face_width, 0.5);
  assert.equal(features.gaze_available, 1);
  assert.equal(JSON.stringify(features).includes("image"), false);
});

test("extracts locally and releases detector and canvas resources", async () => {
  let closed = false;
  let removed = false;
  let drawCalls = 0;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => { drawCalls += 1; } }),
    remove: () => { removed = true; },
  };
  const extractor = new BrowserFeatureExtractor({
    detectorFactory: () => ({ detect: async () => [face], close: () => { closed = true; } }),
    canvasFactory: () => canvas,
  });
  const result = await extractor.extract({ videoWidth: 640, videoHeight: 480 });
  assert.equal(result.quality.observable, true);
  assert.equal(drawCalls, 1);
  assert.deepEqual(Object.keys(result).sort(), ["captured_at", "extractor_version", "features", "frame", "quality"]);
  extractor.close();
  assert.equal(closed, true);
  assert.equal(removed, true);
  assert.equal(canvas.width, 0);
});

test("fails closed when the browser detector is unavailable", async () => {
  const extractor = new BrowserFeatureExtractor({ detectorFactory: () => null });
  const result = await extractor.extract({ videoWidth: 640, videoHeight: 480 });
  assert.equal(result.quality.observable, false);
  assert.equal(result.quality.reason, "detector_unavailable");
  assert.equal(result.features.face_present, null);
});

test("pins a selected camera and limits resolution and frame rate", () => {
  const selected = cameraConstraints("camera-b");
  assert.deepEqual(selected.video.deviceId, { exact: "camera-b" });
  assert.equal(selected.video.frameRate.max, 24);
  assert.equal(selected.audio, false);
  assert.deepEqual(cameraConstraints().video.facingMode, "user");
});

test("the normal course flow contains no image serialization or frame upload fallback", async () => {
  const source = await readFile(new URL("../app/student/course/[courseId]/page.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("toBlob("), false);
  assert.equal(source.includes("postFrameToML"), false);
  assert.equal(source.includes('form.append("file"'), false);
  assert.match(source, /BROWSER_EXTRACTOR_ENABLED/);
});
