export const FEATURE_CONTRACT_VERSION = "normalized-features-v1";
export const WINDOW_DURATION_MS = 5000;

const clamp = (value, low, high) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Math.min(high, Math.max(low, Number(value)));
};

const rotate = (x, y, orientation) => {
  if (x === null || y === null) return [x, y];
  if (orientation === 90) return [1 - y, x];
  if (orientation === 180) return [1 - x, 1 - y];
  if (orientation === 270) return [y, 1 - x];
  return [x, y];
};

export function normalizeBrowserSample(sample, { orientation = 0, windowMs = WINDOW_DURATION_MS } = {}) {
  const capturedMs = Date.parse(sample.captured_at);
  if (!Number.isFinite(capturedMs)) throw new Error("invalid_captured_at");
  if (![0, 90, 180, 270].includes(orientation)) throw new Error("invalid_orientation");
  if (!Number.isInteger(windowMs) || windowMs < 1000) throw new Error("invalid_window_ms");

  const raw = sample.features || {};
  const rawX = clamp(raw.face_center_x, 0, 1);
  const rawY = clamp(raw.face_center_y, 0, 1);
  const [centerX, centerY] = rotate(rawX, rawY, orientation);
  const quarterTurn = orientation === 90 || orientation === 270;
  const windowStartMs = Math.floor(capturedMs / windowMs) * windowMs;
  const facePresent = clamp(raw.face_present, 0, 1);
  const observable = sample.quality?.observable === true && facePresent === 1;

  return {
    captured_at: new Date(capturedMs).toISOString(),
    window: {
      started_at: new Date(windowStartMs).toISOString(),
      ended_at: new Date(windowStartMs + windowMs).toISOString(),
    },
    features: {
      face_present: facePresent,
      face_count: clamp(raw.face_count, 0, 1),
      face_center_x: centerX,
      face_center_y: centerY,
      face_width: clamp(quarterTurn ? raw.face_height : raw.face_width, 0, 1),
      face_height: clamp(quarterTurn ? raw.face_width : raw.face_height, 0, 1),
      eye_span: clamp(raw.eye_span, 0, 1),
      head_roll: clamp(raw.head_roll, -1, 1),
      gaze_horizontal_proxy: clamp(raw.gaze_horizontal_proxy, 0, 1),
      pose_available: clamp(raw.pose_available, 0, 1),
      gaze_available: clamp(raw.gaze_available, 0, 1),
      window_offset_ms: capturedMs - windowStartMs,
      window_duration_ms: windowMs,
    },
    quality: {
      observable,
      confidence: observable ? clamp(sample.quality?.confidence, 0, 1) : null,
      reason: observable ? null : (sample.quality?.reason || "insufficient_signal"),
    },
  };
}

export function buildNormalizedEvent(sample, context) {
  const normalized = normalizeBrowserSample(sample, context);
  return {
    contract_version: "2.0",
    event_id: context.eventId || crypto.randomUUID(),
    session_type: "course",
    session_id: context.sessionId,
    captured_at: normalized.captured_at,
    features: { ...normalized.features, profile_generation: context.profileGeneration ?? 0 },
    quality: normalized.quality,
    device: {
      class: context.deviceClass || "unknown",
      browser_family: context.browserFamily || "unknown",
      extractor_version: sample.extractor_version,
      preprocessing_version: FEATURE_CONTRACT_VERSION,
      execution_profile: context.executionProfile || "low",
    },
    consent: { version: context.consentVersion, purposes: [...context.purposes].sort() },
  };
}
