import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEdgeShadowReport,
  shouldPersistNormalizedObservation,
  shouldReportEdgeShadow,
} from "../app/lib/edge-shadow-report.mjs";

const event = {
  event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  session_id: 7,
  captured_at: "2026-09-21T10:00:00.000Z",
  features: { window_duration_ms: 5000, profile_generation: 2, face_center_x: 0.5 },
  quality: { observable: true, confidence: 0.8, reason: null },
  device: { execution_profile: "balanced" },
};
const result = {
  model_version: "masked-gru-observable-evidence-v1-synthetic",
  artifact_sha256: "e".repeat(64),
  probability: 0.8,
  evidence_state: "task_oriented_evidence",
  mode: "shadow_only",
  allow_intervention: false,
  interpretation: "observable_evidence_not_internal_attention",
  execution_location: "local_device",
};

test("builds a minimal edge report without observations or device identifiers", () => {
  const report = buildEdgeShadowReport(event, result, {
    cryptoImpl: { randomUUID: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
    sampleCount: 12,
  });
  assert.deepEqual(Object.keys(report).sort(), [
    "allow_intervention", "artifact_sha256", "captured_at", "contract_version",
    "execution_location", "execution_profile", "inference_id", "interpretation", "mode",
    "model_version", "probability", "profile_generation", "quality", "session_id", "state",
    "window_duration_ms",
  ]);
  assert.equal(report.session_id, event.session_id);
  assert.equal(report.quality.sample_count, 12);
  assert.equal(JSON.stringify(report).includes("face_center"), false);
  assert.equal(JSON.stringify(report).includes(event.event_id), false);
  assert.equal(JSON.stringify(report).includes("image"), false);
});

test("strict Edge reporting disables normalized observation persistence", () => {
  assert.equal(shouldPersistNormalizedObservation({ edgeReportingEnabled: true, shadowEnabled: true }), false);
  assert.equal(shouldPersistNormalizedObservation({ edgeReportingEnabled: false, shadowEnabled: true }), true);
  assert.equal(shouldPersistNormalizedObservation({ edgeReportingEnabled: true, shadowEnabled: false }), true);
});

test("reports at most once per five-second window", () => {
  assert.equal(shouldReportEdgeShadow(null, event.captured_at), true);
  const start = Date.parse(event.captured_at);
  assert.equal(shouldReportEdgeShadow(start, "2026-09-21T10:00:04.999Z"), false);
  assert.equal(shouldReportEdgeShadow(start, "2026-09-21T10:00:05.000Z"), true);
});

test("rejects fallback and unverifiable model outputs", () => {
  assert.throws(() => buildEdgeShadowReport(event, { ...result, artifact_sha256: null }), /canonical_artifact_identity_missing/);
  assert.throws(() => buildEdgeShadowReport(event, { ...result, execution_location: "local_fallback" }), /non_edge_result_rejected/);
});
