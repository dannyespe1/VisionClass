import assert from "node:assert/strict";
import test from "node:test";

import { AdaptiveScheduler } from "../app/lib/adaptive-scheduler.mjs";

const healthy = {
  latencyBucket: "under_50",
  energyBucket: "normal",
  networkBucket: "fast",
  cpuLoadBucket: "normal",
  coverage: 0.95,
  uncertainty: 0.2,
  qualityAllowed: true,
  consentGranted: true,
  privacyAllowed: true,
};

test("degrades progressively under sustained overload and respects dwell time", () => {
  let clock = 0;
  const scheduler = new AdaptiveScheduler({ initialProfile: "high", now: () => clock, policy: { minimumDwellMs: 1000 } });
  const overloaded = { ...healthy, latencyBucket: "250_plus", cpuLoadBucket: "saturated" };
  clock = 1000;
  assert.equal(scheduler.evaluate(overloaded).profile, "high");
  clock = 1100;
  const first = scheduler.evaluate(overloaded);
  assert.equal(first.profile, "balanced");
  assert.equal(first.changed, true);
  clock = 1200;
  scheduler.evaluate(overloaded);
  clock = 2200;
  const second = scheduler.evaluate(overloaded);
  assert.equal(second.profile, "low");
});

test("does not oscillate on brief noise and requires sustained recovery", () => {
  let clock = 0;
  const scheduler = new AdaptiveScheduler({ initialProfile: "balanced", now: () => clock, policy: { minimumDwellMs: 1000 } });
  clock = 1000;
  scheduler.evaluate({ ...healthy, latencyBucket: "250_plus" });
  clock = 1100;
  assert.equal(scheduler.evaluate(healthy).profile, "balanced");
  clock = 2000;
  assert.equal(scheduler.evaluate(healthy).profile, "balanced");
  clock = 2100;
  assert.equal(scheduler.evaluate(healthy).profile, "high");
});

test("uses safe fallback for poor signal and remains local when network is lost", () => {
  let clock = 1000;
  const scheduler = new AdaptiveScheduler({ now: () => clock, policy: { minimumDwellMs: 0 } });
  const poor = scheduler.evaluate({ ...healthy, coverage: 0.3, uncertainty: 0.9 });
  assert.equal(poor.inferenceLocation, "local_fallback");
  clock += 1;
  const offline = scheduler.evaluate({ ...healthy, networkBucket: "offline" });
  assert.equal(offline.inferenceLocation, "local_device");
  assert.notEqual(offline.inferenceLocation, "remote");
  clock += 1;
  const uncertain = scheduler.evaluate({ ...healthy, uncertainty: 0.95 });
  assert.equal(uncertain.inferenceLocation, "local_fallback");
});

test("consent and privacy are inviolable and invalid metrics fail closed", () => {
  const scheduler = new AdaptiveScheduler();
  for (const input of [
    { ...healthy, consentGranted: false },
    { ...healthy, privacyAllowed: false },
    { ...healthy, latencyBucket: "precise_73ms" },
  ]) {
    const decision = scheduler.evaluate(input);
    assert.equal(decision.enabled, false);
    assert.equal(decision.inferenceLocation, "disabled");
    assert.equal(decision.sampleIntervalMs, null);
  }
});

test("keeps only a bounded decision log with coarse metrics", () => {
  let clock = 0;
  const scheduler = new AdaptiveScheduler({ now: () => clock, policy: { decisionLogLimit: 2, minimumDwellMs: 0 } });
  scheduler.evaluate(healthy);
  clock += 1;
  scheduler.evaluate({ ...healthy, networkBucket: "slow" });
  clock += 1;
  scheduler.evaluate({ ...healthy, energyBucket: "saver" });
  const records = scheduler.drainDecisions();
  assert.equal(records.length, 2);
  assert.deepEqual(Object.keys(records[0].metrics).sort(), [
    "consentGranted", "coverage", "cpuLoadBucket", "energyBucket", "latencyBucket",
    "networkBucket", "privacyAllowed", "qualityAllowed", "uncertainty",
  ]);
});
