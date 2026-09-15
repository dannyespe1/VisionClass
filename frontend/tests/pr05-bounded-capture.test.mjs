import assert from "node:assert/strict";
import test from "node:test";
import { BoundedCaptureQueue, sendNonVisualWithBackoff } from "../app/lib/bounded-capture-queue.mjs";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
};

test("keeps one active and one replaceable pending frame", async () => {
  const first = deferred();
  const queue = new BoundedCaptureQueue({ timeoutMs: 1000 });
  const a = queue.enqueue(() => first.promise);
  const b = queue.enqueue(async () => "second");
  const c = queue.enqueue(async () => "third");

  assert.equal(queue.snapshot().outstanding, 2);
  assert.equal((await b).status, "replaced");
  first.resolve("first");
  assert.equal((await a).status, "obsolete");
  const outcome = await c;
  assert.equal(outcome.status, "confirmed");
  assert.equal(outcome.value, "third");
  assert.equal(queue.snapshot().outstanding, 0);
});

test("cancels active and pending work when capture stops", async () => {
  const queue = new BoundedCaptureQueue({ timeoutMs: 1000 });
  const active = queue.enqueue(({ signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  const pending = queue.enqueue(async () => "never");
  queue.stop();

  assert.equal((await pending).status, "cancelled");
  assert.equal((await active).status, "cancelled");
  assert.equal(queue.snapshot().stopped, true);
});

test("times out a visual request once without retry", async () => {
  let attempts = 0;
  const queue = new BoundedCaptureQueue({ timeoutMs: 10 });
  const outcome = await queue.enqueue(({ signal }) => {
    attempts += 1;
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("deadline")), { once: true });
    });
  });

  assert.equal(outcome.status, "timed_out");
  assert.equal(attempts, 1);
});

test("uses backoff only through the separate non-visual helper", async () => {
  const delays = [];
  let attempts = 0;
  const value = await sendNonVisualWithBackoff(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary");
      return "ok";
    },
    { baseDelayMs: 5, sleep: async (ms) => { delays.push(ms); } },
  );

  assert.equal(value, "ok");
  assert.deepEqual(delays, [5, 10]);
});
