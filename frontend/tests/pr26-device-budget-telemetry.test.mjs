import assert from "node:assert/strict";
import test from "node:test";
import {
  bucketEnergy,
  bucketLatency,
  bucketMemory,
  bucketNetwork,
  DeviceBudgetCollector,
} from "../app/lib/device-budget-telemetry.mjs";

test("uses only broad resource buckets and rejects impossible values", () => {
  assert.equal(bucketLatency(-1), "unknown");
  assert.equal(bucketLatency(70), "50_to_99");
  assert.equal(bucketMemory(1024), "unknown");
  assert.equal(bucketMemory(4), "3_to_4");
  assert.equal(bucketNetwork("2g"), "slow");
  assert.equal(bucketNetwork("4g", false), "offline");
  assert.equal(bucketEnergy({ level: 0.1 }), "low");
  assert.equal(bucketEnergy({ level: 0.8, charging: true }), "charging");
});

test("emits a session/profile aggregate without fingerprint fields", () => {
  let clock = 0;
  const collector = new DeviceBudgetCollector({ minSamples: 2, minWindowMs: 100, now: () => clock });
  collector.record({ at: 10, latencyMs: 20 });
  collector.record({ at: 110, latencyMs: 30 });
  clock = 200;
  const payload = collector.take({
    sessionId: 7,
    profile: "balanced",
    profileGeneration: 2,
    deviceMemory: 4,
    effectiveType: "3g",
    online: true,
    energy: { level: 0.7 },
  });
  assert.equal(payload.session_id, 7);
  assert.equal(payload.profile, "balanced");
  assert.equal(payload.sample_count, 2);
  for (const forbidden of ["user_id", "device_id", "user_agent", "screen", "hardware_concurrency", "ip", "email", "demographics"]) {
    assert.equal(Object.hasOwn(payload, forbidden), false);
  }
});

test("counts discarded samples and does not emit before the sampling window", () => {
  let clock = 0;
  const collector = new DeviceBudgetCollector({ minSamples: 2, minWindowMs: 1000, now: () => clock });
  collector.record({ at: 1, latencyMs: -1 });
  collector.record({ at: 10, latencyMs: 20 });
  assert.equal(collector.take({ sessionId: 1, profile: "low" }), null);
  collector.record({ at: 20, latencyMs: 20 });
  clock = 1001;
  const payload = collector.take({ sessionId: 1, profile: "low" });
  assert.equal(payload.invalid_sample_count, 1);
});

test("represents busy CPU, limited network and battery saver only as broad classes", () => {
  let clock = 0;
  const collector = new DeviceBudgetCollector({ minSamples: 2, minWindowMs: 0, now: () => clock });
  collector.record({ at: 100, latencyMs: 95 });
  collector.record({ at: 200, latencyMs: 95 });
  clock = 201;
  const payload = collector.take({
    sessionId: 3,
    profile: "low",
    profileGeneration: 1,
    deviceMemory: 2,
    effectiveType: "2g",
    online: true,
    energy: { level: 0.5, saver: true },
  });
  assert.equal(payload.cpu_load_bucket, "saturated");
  assert.equal(payload.network_bucket, "slow");
  assert.equal(payload.energy_bucket, "saver");
  assert.equal(payload.device_class, "constrained");
});
