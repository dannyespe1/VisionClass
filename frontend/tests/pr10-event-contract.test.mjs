import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateAttentionEventV2 } from "../app/lib/event-contract.mjs";

const fixture = async (name) => JSON.parse(await readFile(new URL(`../../contracts/fixtures/${name}`, import.meta.url), "utf8"));

test("accepts the shared valid v2 fixture", async () => {
  assert.deepEqual(validateAttentionEventV2(await fixture("attention-event-v2.valid.json")), []);
});

test("rejects invalid ranges types and unknown PII fields", async () => {
  const errors = validateAttentionEventV2(await fixture("attention-event-v2.invalid.json"));
  assert.ok(errors.length >= 5);
  assert.ok(errors.includes("unknown.user_email"));
});
