import assert from "node:assert/strict";
import test from "node:test";

import {
  OCULAR_CALIBRATION_REUSE_STORAGE_KEY,
  clearOcularCalibrationReuse,
  readOcularCalibrationReuse,
  writeOcularCalibrationReuse,
} from "../app/lib/ocular-calibration-reuse.mjs";

const token = "a".repeat(43);
const future = "2030-01-01T12:00:00.000Z";

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test("reuses only a valid proof for the same participant, camera and version", () => {
  const storage = memoryStorage();
  assert.equal(writeOcularCalibrationReuse(storage, {
    participant_id: 17,
    camera_id: "camera-a",
    calibration_version: "ocular-local-v2",
    reuse_token: token,
    valid_until: future,
  }), true);

  assert.deepEqual(readOcularCalibrationReuse(storage, {
    participantId: 17,
    cameraId: "camera-a",
    calibrationVersion: "ocular-local-v2",
  }, Date.parse("2029-01-01T00:00:00.000Z")), {
    reuse_token: token,
    valid_until: future,
  });
});

test("fails closed and removes a proof when context or expiry does not match", () => {
  for (const context of [
    { participantId: 18, cameraId: "camera-a", calibrationVersion: "ocular-local-v2" },
    { participantId: 17, cameraId: "camera-b", calibrationVersion: "ocular-local-v2" },
    { participantId: 17, cameraId: "camera-a", calibrationVersion: "ocular-local-v3" },
  ]) {
    const storage = memoryStorage();
    writeOcularCalibrationReuse(storage, {
      participant_id: 17,
      camera_id: "camera-a",
      calibration_version: "ocular-local-v2",
      reuse_token: token,
      valid_until: future,
    });
    assert.equal(readOcularCalibrationReuse(storage, context, Date.parse("2029-01-01T00:00:00.000Z")), null);
    assert.equal(storage.getItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY), null);
  }

  const expired = memoryStorage();
  writeOcularCalibrationReuse(expired, {
    participant_id: 17,
    camera_id: "camera-a",
    calibration_version: "ocular-local-v2",
    reuse_token: token,
    valid_until: future,
  });
  assert.equal(readOcularCalibrationReuse(expired, {
    participantId: 17,
    cameraId: "camera-a",
    calibrationVersion: "ocular-local-v2",
  }, Date.parse("2031-01-01T00:00:00.000Z")), null);
});

test("explicit revocation removes the local proof", () => {
  const storage = memoryStorage();
  storage.setItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY, "saved");
  clearOcularCalibrationReuse(storage);
  assert.equal(storage.getItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY), null);
});
