export const EDGE_SHADOW_REPORT_INTERVAL_MS = Math.max(
  5000,
  Number(process.env.NEXT_PUBLIC_EDGE_SHADOW_REPORT_INTERVAL_MS || "5000"),
);

export function shouldReportEdgeShadow(lastReportedAt, capturedAt, intervalMs = EDGE_SHADOW_REPORT_INTERVAL_MS) {
  const current = Date.parse(capturedAt);
  if (!Number.isFinite(current)) return false;
  return lastReportedAt === null || current - lastReportedAt >= intervalMs;
}

export function shouldPersistNormalizedObservation({ edgeReportingEnabled, shadowEnabled }) {
  return !(edgeReportingEnabled && shadowEnabled);
}

export function buildEdgeShadowReport(event, result, {
  cryptoImpl = globalThis.crypto,
  sampleCount = 1,
} = {}) {
  if (!cryptoImpl?.randomUUID) throw new Error("random_uuid_unavailable");
  if (!Number.isInteger(event?.session_id) || event.session_id < 1) throw new Error("session_id_missing");
  if (!result?.model_version || !/^[a-f0-9]{64}$/.test(result.artifact_sha256 || "")) {
    throw new Error("canonical_artifact_identity_missing");
  }
  if (result.execution_location !== "local_device") throw new Error("non_edge_result_rejected");
  return {
    contract_version: "edge-shadow-inference-v2",
    inference_id: cryptoImpl.randomUUID(),
    session_id: event.session_id,
    captured_at: event.captured_at,
    window_duration_ms: event.features.window_duration_ms,
    execution_profile: event.device.execution_profile,
    profile_generation: event.features.profile_generation,
    quality: {
      observable: event.quality.observable,
      confidence: event.quality.confidence,
      reason: event.quality.reason,
      sample_count: Math.max(1, Math.min(128, Number.isInteger(sampleCount) ? sampleCount : 1)),
    },
    model_version: result.model_version,
    artifact_sha256: result.artifact_sha256,
    state: result.evidence_state,
    probability: result.probability,
    mode: result.mode,
    allow_intervention: result.allow_intervention,
    interpretation: result.interpretation,
    execution_location: result.execution_location,
  };
}
