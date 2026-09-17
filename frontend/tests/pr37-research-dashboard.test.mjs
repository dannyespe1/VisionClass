import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { postLoginRoute } from "../app/lib/post-login-route.mjs";

const page = readFileSync(new URL("../app/research/page.tsx", import.meta.url), "utf8");
const features = readFileSync(new URL("../app/lib/features.ts", import.meta.url), "utf8");

test("research panel is fail-closed and receives its own least-privilege route", () => {
  assert.match(features, /NEXT_PUBLIC_RESEARCH_DASHBOARD/);
  assert.match(features, /=== "true"/);
  assert.equal(postLoginRoute({ role: "researcher" }), "/research");
});

test("panel exposes scoped filters, provenance, sample and explicit evidence status", () => {
  for (const term of ["period", "cohort", "model", "profile", "Proveniencia", "Ventanas observables", "Validez", "Equidad", "not_linked"]) assert.match(page, new RegExp(term, "i"));
});

test("export is purpose-bound, short-lived, one-time and never persists its token", () => {
  assert.match(page, /purpose: dashboard\.grant\.purpose/);
  assert.match(page, /expires_in_minutes: 10/);
  assert.match(page, /download_token: lease\.download_token/);
  assert.match(page, /cache: "no-store"/);
  assert.doesNotMatch(page, /localStorage.*download_token|sessionStorage.*download_token/);
});

test("privacy suppression and prohibited interpretations remain explicit", () => {
  assert.match(page, /Celda suprimida por protección de muestra/);
  assert.match(page, /No se muestran conteos parciales/);
  assert.match(page, /no mide estados mentales/i);
  assert.doesNotMatch(page, /ranking|diagnóstico|riesgo del estudiante/i);
});
