import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildNormalizedEvent, normalizeBrowserSample } from "../app/lib/feature-normalization.mjs";
import { validateAttentionEventV2 } from "../app/lib/event-contract.mjs";

const fixture = async (name) => JSON.parse(await readFile(new URL(`../../contracts/fixtures/${name}`, import.meta.url), "utf8"));

test("matches the shared golden fixture after a 90 degree orientation change", async () => {
  const raw = await fixture("browser-features-v1.raw.json");
  const expected = await fixture("browser-features-v1.normalized-90.json");
  assert.deepEqual(normalizeBrowserSample(raw, { orientation: 90 }), expected);
});

test("uses null for missing values and separates absence from zero", () => {
  const value = normalizeBrowserSample({
    captured_at: "2026-09-15T12:00:00Z",
    features: { face_present: null },
    quality: { observable: false, reason: "partial_face" },
  });
  assert.equal(value.features.face_center_x, null);
  assert.equal(value.features.face_present, null);
  assert.equal(value.quality.reason, "partial_face");
  assert.equal(value.quality.confidence, null);
});

test("builds a valid v2 event with extractor and preprocessing versions", async () => {
  const raw = await fixture("browser-features-v1.raw.json");
  const event = buildNormalizedEvent(raw, {
    eventId: "123e4567-e89b-42d3-a456-426614174001",
    sessionId: 42,
    consentVersion: "pending-review-v1",
    purposes: ["derived_persistence", "local_processing"],
    browserFamily: "chromium",
    deviceClass: "laptop",
  });
  assert.deepEqual(validateAttentionEventV2(event), []);
  assert.equal(event.device.extractor_version, "browser-face-detector-v1");
  assert.equal(event.device.preprocessing_version, "normalized-features-v1");
});
