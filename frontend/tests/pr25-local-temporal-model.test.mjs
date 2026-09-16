import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LocalTemporalEngine,
  SafeLocalTemporalFallback,
  loadLocalTemporalModel,
  validateLocalTemporalArtifact,
} from "../app/lib/local-temporal-model.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const artifactBytes = await readFile(new URL("../public/models/temporal-reference.v1.json", import.meta.url));
const artifact = JSON.parse(artifactBytes.toString("utf8"));
const manifest = JSON.parse(await readFile(new URL("../public/models/temporal-reference.v1.manifest.json", import.meta.url), "utf8"));
const fixtures = JSON.parse(await readFile(new URL("../../docs/PR25/PARITY_FIXTURES.json", import.meta.url), "utf8"));

function responseJson(value) {
  return { ok: true, async json() { return structuredClone(value); } };
}

function responseBytes(value) {
  return {
    ok: true,
    async arrayBuffer() {
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    },
  };
}

function fetchFor(bytes = artifactBytes, requests = [], manifestValue = manifest) {
  return async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith(".manifest.json")) return responseJson(manifestValue);
    if (url.endsWith(".json")) return responseBytes(bytes);
    return { ok: false };
  };
}

test("matches PR20 numeric posterior and decisions on the parity fixture", () => {
  const engine = new LocalTemporalEngine(artifact);
  for (let index = 0; index < fixtures.events.length; index += 1) {
    const actual = engine.update(fixtures.events[index]);
    const expected = fixtures.expected[index];
    assert.equal(actual.evidence_state, expected.evidence_state);
    assert.equal(actual.reset_reason, expected.reset_reason);
    assert.equal(actual.allow_intervention, false);
    assert.equal(actual.execution_location, "local_device");
    for (const state of ["off_task_evidence", "task_oriented_evidence"]) {
      assert.ok(Math.abs(actual.posterior[state] - expected.posterior[state]) <= fixtures.numeric_tolerance);
    }
    assert.ok(Math.abs(actual.uncertainty - expected.uncertainty) <= fixtures.numeric_tolerance);
  }
});

test("loads only a same-origin artifact after length and sha256 validation", async () => {
  const requests = [];
  const loaded = await loadLocalTemporalModel({
    enabled: true,
    origin: "https://visionclass.test",
    fetchImpl: fetchFor(artifactBytes, requests),
    cryptoImpl: webcrypto,
    allowEngineeringArtifact: true,
  });
  assert.equal(loaded.status, "ready");
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ url }) => new URL(url).origin === "https://visionclass.test"));
  assert.ok(requests.every(({ options }) => options.credentials === "same-origin"));
  assert.equal(loaded.engine.update(fixtures.events[0]).allow_intervention, false);
});

test("rejects tampering incompatible versions and unsigned engineering use by default", async () => {
  const tampered = Buffer.from(artifactBytes);
  tampered[tampered.length - 2] = tampered[tampered.length - 2] === 32 ? 33 : 32;
  const hashFailure = await loadLocalTemporalModel({
    enabled: true,
    origin: "https://visionclass.test",
    fetchImpl: fetchFor(tampered),
    cryptoImpl: webcrypto,
    allowEngineeringArtifact: true,
  });
  assert.equal(hashFailure.status, "fallback");
  assert.equal(hashFailure.reason, "artifact_hash_mismatch");
  assert.equal(hashFailure.engine.update().evidence_state, "no_observable");

  const guarded = await loadLocalTemporalModel({
    enabled: true,
    origin: "https://visionclass.test",
    fetchImpl: fetchFor(),
    cryptoImpl: webcrypto,
  });
  assert.equal(guarded.status, "fallback");
  assert.equal(guarded.reason, "engineering_artifact_not_enabled");
  const forgedEligibility = await loadLocalTemporalModel({
    enabled: true,
    origin: "https://visionclass.test",
    fetchImpl: fetchFor(artifactBytes, [], { ...manifest, deployment_eligibility: "production" }),
    cryptoImpl: webcrypto,
    allowEngineeringArtifact: true,
  });
  assert.equal(forgedEligibility.status, "fallback");
  assert.equal(forgedEligibility.reason, "unsupported_deployment_manifest");
  assert.throws(
    () => validateLocalTemporalArtifact({ ...artifact, format_version: "future-format" }),
    /unsupported_format_version/,
  );
});

test("disabled and cross-origin paths fail locally without server inference", async () => {
  let calls = 0;
  const disabled = await loadLocalTemporalModel({
    enabled: false,
    fetchImpl: async () => { calls += 1; throw new Error("must_not_fetch"); },
  });
  assert.equal(calls, 0);
  assert.equal(disabled.engine.update().execution_location, "local_fallback");

  const crossOrigin = await loadLocalTemporalModel({
    enabled: true,
    artifactUrl: "https://attacker.test/model.json",
    origin: "https://visionclass.test",
    fetchImpl: async () => { calls += 1; throw new Error("must_not_fetch"); },
  });
  assert.equal(crossOrigin.status, "fallback");
  assert.equal(crossOrigin.reason, "cross_origin_artifact_rejected");
  assert.equal(calls, 0);
});

test("safe fallback never converts missing signal into a negative decision", () => {
  const fallback = new SafeLocalTemporalFallback("controlled_failure");
  const output = fallback.update({ raw_frame: "not_consumed" });
  assert.equal(output.evidence_state, "no_observable");
  assert.equal(output.allow_intervention, false);
  assert.deepEqual(output.posterior, { off_task_evidence: 0.5, task_oriented_evidence: 0.5 });
});

test("CPU reference runtime stays within the engineering fixture budget", () => {
  const engine = new LocalTemporalEngine(artifact);
  const started = performance.now();
  for (let index = 0; index < 10000; index += 1) {
    engine.update({ timestamp_ms: index, observable: true, probability: index % 2 ? 0.2 : 0.8 });
  }
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 500, `10000 local updates took ${elapsed.toFixed(2)} ms in ${root}`);
});
