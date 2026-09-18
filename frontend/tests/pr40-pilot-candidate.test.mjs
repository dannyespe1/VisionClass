import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const features = readFileSync(new URL("../app/lib/features.ts", import.meta.url), "utf8");
const frontendEnv = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const backendSettings = readFileSync(new URL("../../backend/core/settings.py", import.meta.url), "utf8");
const candidate = JSON.parse(
  readFileSync(new URL("../../release/pilot-candidate/candidate.json", import.meta.url), "utf8"),
);

test("candidate remains prepared and not activated", () => {
  assert.equal(candidate.status, "PREPARED_NOT_DEPLOYED");
  assert.equal(candidate.pilot_activation, false);
  assert.match(frontendEnv, /^NEXT_PUBLIC_PILOT_RELEASE=false$/m);
});

test("all pending product modules require the global pilot gate", () => {
  assert.equal((features.match(/PILOT_RELEASE_ENABLED &&/g) ?? []).length, 4);
  for (const flag of [
    "STUDENT_ATTENTION_DASHBOARD",
    "TEACHER_GROUP_DASHBOARD",
    "RESEARCH_DASHBOARD",
    "CONSERVATIVE_INTERVENTIONS",
  ]) {
    assert.match(backendSettings, new RegExp(`${flag}\\s*=\\s*PILOT_RELEASE and`));
  }
});

test("candidate excludes modules that still require separate review", () => {
  assert.deepEqual(candidate.excluded_until_separate_approval, ["PR35", "PR36", "PR37", "PR38"]);
  for (const value of Object.values(candidate.required_flags)) assert.equal(value, false);
});
