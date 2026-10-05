export const OCULAR_CALIBRATION_REUSE_STORAGE_KEY = "visionclass:ocular-calibration-reuse:v1";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,96}$/;

const storageAvailable = (storage) => storage && typeof storage.getItem === "function";

export function readOcularCalibrationReuse(storage, context, now = Date.now()) {
  if (!storageAvailable(storage)) return null;
  try {
    const raw = storage.getItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    const validUntil = Date.parse(value?.valid_until || "");
    const valid =
      value?.schema_version === 1 &&
      Number.isInteger(value?.participant_id) &&
      value.participant_id === context.participantId &&
      typeof value?.camera_id === "string" &&
      value.camera_id.length > 0 &&
      value.camera_id === context.cameraId &&
      value?.calibration_version === context.calibrationVersion &&
      typeof value?.reuse_token === "string" &&
      TOKEN_PATTERN.test(value.reuse_token) &&
      Number.isFinite(validUntil) &&
      validUntil > now;
    if (!valid) {
      storage.removeItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY);
      return null;
    }
    return {
      reuse_token: value.reuse_token,
      valid_until: value.valid_until,
    };
  } catch {
    try {
      storage.removeItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY);
    } catch {
      // Storage may be disabled; fail closed and require calibration.
    }
    return null;
  }
}

export function writeOcularCalibrationReuse(storage, proof) {
  if (!storageAvailable(storage)) return false;
  const validUntil = Date.parse(proof?.valid_until || "");
  if (
    !Number.isInteger(proof?.participant_id) ||
    typeof proof?.camera_id !== "string" ||
    proof.camera_id.length === 0 ||
    typeof proof?.calibration_version !== "string" ||
    !TOKEN_PATTERN.test(proof?.reuse_token || "") ||
    !Number.isFinite(validUntil) ||
    validUntil <= Date.now()
  ) {
    return false;
  }
  try {
    storage.setItem(
      OCULAR_CALIBRATION_REUSE_STORAGE_KEY,
      JSON.stringify({ schema_version: 1, ...proof }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearOcularCalibrationReuse(storage) {
  if (!storageAvailable(storage)) return;
  try {
    storage.removeItem(OCULAR_CALIBRATION_REUSE_STORAGE_KEY);
  } catch {
    // Revocation still stops capture even if browser storage is unavailable.
  }
}
