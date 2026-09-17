import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/student/course/[courseId]/page.tsx", import.meta.url), "utf8");
const flags = await readFile(new URL("../app/lib/capture-features.ts", import.meta.url), "utf8");
const scheduler = await readFile(new URL("../app/lib/adaptive-scheduler.mjs", import.meta.url), "utf8");

test("PR27A keeps explicit policy priorities and a sub-100ms target bucket", () => {
  assert.match(scheduler, /latencyBudgetBucket:\s*"50_to_99"/);
  assert.match(scheduler, /minimumCoverage:\s*0\.7/);
  assert.match(scheduler, /maximumUncertainty:\s*0\.7/);
  assert.match(scheduler, /if \(!metrics \|\| !metrics\.consentGranted \|\| !metrics\.privacyAllowed\)[\s\S]*const pressure = pressureReason/);
});

test("PR27B exposes hysteresis dwell progressive steps and local fallback", () => {
  assert.match(scheduler, /degradeWindows:\s*2/);
  assert.match(scheduler, /recoverWindows:\s*3/);
  assert.match(scheduler, /minimumDwellMs:\s*30000/);
  assert.match(scheduler, /local_fallback/);
  assert.doesNotMatch(scheduler, /inferenceLocation:\s*"remote"/);
});

test("PR27C integrates adaptation, telemetry opt-out and explicit fixed-profile rollback", () => {
  assert.match(flags, /NEXT_PUBLIC_EDGE_FIXED_PROFILE/);
  assert.match(page, /EDGE_FIXED_PROFILE[\s\S]*fixed_rollback_profile[\s\S]*EDGE_PROFILES_ENABLED/);
  assert.match(page, /DEVICE_BUDGET_TELEMETRY_ENABLED && permissionSettings\.saveAnalytics/);
  assert.match(page, /track\.applyConstraints/);
});
