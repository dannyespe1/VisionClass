import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/student/course/[courseId]/page.tsx", import.meta.url), "utf8");
const features = readFileSync(new URL("../app/lib/features.ts", import.meta.url), "utf8");
const env = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

test("conservative interventions remain disabled by default", () => {
  assert.match(features, /NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS/);
  assert.match(env, /NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS=false/);
  assert.match(page, /CONSERVATIVE_INTERVENTIONS_ENABLED/);
});

test("client asks the server and never classifies or invents an intervention locally", () => {
  const requestStart = page.indexOf('"/api/interventions/evaluate/"');
  const requestEnd = page.indexOf("const interval", requestStart);
  const evaluationBlock = page.slice(requestStart, requestEnd);
  assert.match(page, /\/api\/interventions\/evaluate\//);
  assert.match(page, /session_id: sessionId/);
  assert.match(page, /un fallo nunca genera una sugerencia local improvisada/);
  assert.match(page, /decision\.state === "presented"/);
  assert.match(page, /if \(inFlight\) return/);
  assert.doesNotMatch(evaluationBlock, /attentionScore|off_task_evidence|uncertainty/);
});

test("evaluation is excluded without capture persistence or during assessments", () => {
  assert.match(page, /permissionSettings\.enableCamera/);
  assert.match(page, /permissionSettings\.enableAttentionTracking/);
  assert.match(page, /permissionSettings\.saveAnalytics/);
  assert.match(page, /currentMaterial\?\.materialType === "test"/);
});

test("suggestion is optional accessible and dismissible without teacher messaging", () => {
  assert.match(page, /Sugerencia opcional/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /Ignorar sugerencia/);
  assert.doesNotMatch(page, /notificar.*docente|enviar.*docente/i);
});
