import assert from "node:assert/strict";
import test from "node:test";
import { constraintsForProfile, EdgeProfileController, profileForEnvironment, SAFE_EDGE_PROFILE } from "../app/lib/edge-profiles.mjs";

test("defines a safe fallback and bounded constraints for every profile", () => {
  assert.equal(SAFE_EDGE_PROFILE, "low");
  assert.equal(constraintsForProfile("low").video.width.max, 320);
  assert.equal(constraintsForProfile("balanced").video.frameRate.max, 10);
  assert.equal(constraintsForProfile("high").video.height.max, 720);
  assert.equal(constraintsForProfile("unknown").video.width.max, 320);
});

test("selects conservative profiles for slow background and low battery devices", () => {
  assert.equal(profileForEnvironment({ hardwareConcurrency: 2, deviceMemory: 2 }), "low");
  assert.equal(profileForEnvironment({ hardwareConcurrency: 8, deviceMemory: 8, hidden: true }), "low");
  assert.equal(profileForEnvironment({ hardwareConcurrency: 8, deviceMemory: 8, batteryLevel: 0.1 }), "low");
  assert.equal(profileForEnvironment({ hardwareConcurrency: 4, deviceMemory: 4 }), "balanced");
  assert.equal(profileForEnvironment({ hardwareConcurrency: 8, deviceMemory: 8 }), "high");
});

test("rejects remote selection unless consented and constrains device capability", () => {
  const denied = new EdgeProfileController({ remoteSelection: false });
  assert.equal(denied.select("high", { source: "remote" }).reason, "remote_not_consented");
  const constrained = new EdgeProfileController({ remoteSelection: true, maxProfile: "balanced" });
  assert.equal(constrained.select("high", { source: "remote" }).profile, "balanced");
});

test("increments generation and requests window reset without identifying telemetry", () => {
  let clock = Date.parse("2026-09-15T12:00:00Z");
  const controller = new EdgeProfileController({ remoteSelection: true, minimumSwitchMs: 10000, now: () => clock });
  const first = controller.select("balanced", { source: "local", reason: "manual" });
  assert.equal(first.resetWindow, true);
  assert.equal(first.generation, 1);
  clock += 1000;
  assert.equal(controller.select("high", { source: "local" }).reason, "switch_cooldown");
  clock += 10000;
  assert.equal(controller.select("high", { source: "local" }).generation, 2);
  const telemetry = controller.drainTelemetry();
  assert.equal(telemetry.length, 2);
  assert.deepEqual(Object.keys(telemetry[0]).sort(), ["at", "from", "generation", "reason", "source", "to"]);
});
