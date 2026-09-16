import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  adaptMediaPipeDetection,
  MEDIAPIPE_FACE_MODEL,
  MEDIAPIPE_WASM_BASE,
} from "../app/lib/mediapipe-face-detector.mjs";
import { MODEL_SHA256, MODEL_URL, sha256 } from "../scripts/prepare-mediapipe-assets.mjs";

test("adapts only numeric derived features and converts normalized keypoints", () => {
  const result = adaptMediaPipeDetection({
    boundingBox: { originX: 10, originY: 20, width: 100, height: 80 },
    keypoints: [{ x: 0.25, y: 0.5, label: "left eye" }],
    categories: [{ score: 0.9 }],
  }, 640, 480);
  assert.deepEqual(result.landmarks[0], { type: "leftEye", locations: [{ x: 160, y: 240 }] });
  assert.equal(result.confidence, 0.9);
  assert.equal(JSON.stringify(result).includes("image"), false);
});

test("runtime assets are same-origin paths while build input is checksum pinned", () => {
  assert.equal(MEDIAPIPE_WASM_BASE.startsWith("/"), true);
  assert.equal(MEDIAPIPE_FACE_MODEL.startsWith("/"), true);
  assert.equal(MEDIAPIPE_WASM_BASE.includes("http"), false);
  assert.equal(MEDIAPIPE_FACE_MODEL.includes("http"), false);
  assert.match(MODEL_URL, /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//);
  assert.match(MODEL_SHA256, /^[a-f0-9]{64}$/);
  assert.equal(sha256(Buffer.from("visionclass")), "a501b4b1bc1bbf5c9806717b78db4c4f6d2d133e9880872a90a981ea7d22eb1c");
});

test("course capture has no image upload path and includes compatibility recovery", async () => {
  const source = await readFile(new URL("../app/student/course/[courseId]/page.tsx", import.meta.url), "utf8");
  assert.equal(source.includes('form.append("file"'), false);
  assert.equal(source.includes("toBlob("), false);
  assert.match(source, /enumerateDevices\(\)/);
  assert.match(source, /document\.visibilityState === "hidden"/);
  assert.match(source, /else if \(permissionSettings\.enableCamera\)/);
  assert.match(source, /browserFamilyFromUserAgent/);
  assert.match(source, /generation !== cameraGenerationRef\.current/);
});
