const DEFAULT_TIMEOUT_MS = 4500;

export class BoundedCaptureQueue {
  constructor({ timeoutMs = DEFAULT_TIMEOUT_MS, onState = () => {} } = {}) {
    this.timeoutMs = timeoutMs;
    this.onState = onState;
    this.active = null;
    this.pending = null;
    this.sequence = 0;
    this.generation = 0;
    this.stopped = false;
    this.stats = { confirmed: 0, failed: 0, timedOut: 0, replaced: 0, obsolete: 0, cancelled: 0 };
    this._emit("idle");
  }

  enqueue(run) {
    const sequence = ++this.sequence;
    if (this.stopped) {
      this.stats.cancelled += 1;
      return Promise.resolve({ status: "cancelled", sequence });
    }
    return new Promise((resolve) => {
      const task = { sequence, generation: this.generation, run, resolve };
      if (this.active) {
        if (this.pending) {
          this.stats.replaced += 1;
          this.pending.resolve({ status: "replaced", sequence: this.pending.sequence });
        }
        this.pending = task;
        this._emit("queued");
        return;
      }
      this._start(task);
    });
  }

  stop() {
    this.stopped = true;
    this.generation += 1;
    if (this.pending) {
      this.stats.cancelled += 1;
      this.pending.resolve({ status: "cancelled", sequence: this.pending.sequence });
      this.pending = null;
    }
    if (this.active) this.active.controller.abort("capture_stopped");
    this._emit("stopped");
  }

  snapshot() {
    return {
      active: this.active ? 1 : 0,
      pending: this.pending ? 1 : 0,
      outstanding: (this.active ? 1 : 0) + (this.pending ? 1 : 0),
      stopped: this.stopped,
      ...this.stats,
    };
  }

  _emit(state) {
    this.onState(state, this.snapshot());
  }

  async _start(task) {
    const controller = new AbortController();
    this.active = { ...task, controller };
    this._emit("sending");
    const timer = setTimeout(() => controller.abort("deadline_exceeded"), this.timeoutMs);
    try {
      const value = await task.run({
        signal: controller.signal,
        idempotencyKey: `frame:${crypto.randomUUID()}`,
        sequence: task.sequence,
      });
      if (task.generation !== this.generation || this.stopped) {
        this.stats.cancelled += 1;
        task.resolve({ status: "cancelled", sequence: task.sequence });
      } else if (this.pending || task.sequence !== this.sequence) {
        this.stats.obsolete += 1;
        task.resolve({ status: "obsolete", sequence: task.sequence });
      } else {
        this.stats.confirmed += 1;
        task.resolve({ status: "confirmed", sequence: task.sequence, value });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        const stopped = this.stopped || task.generation !== this.generation;
        this.stats[stopped ? "cancelled" : "timedOut"] += 1;
        task.resolve({ status: stopped ? "cancelled" : "timed_out", sequence: task.sequence });
      } else {
        this.stats.failed += 1;
        task.resolve({ status: "failed", sequence: task.sequence, error });
      }
    } finally {
      clearTimeout(timer);
      this.active = null;
      if (!this.stopped && this.pending) {
        const next = this.pending;
        this.pending = null;
        this._start(next);
      } else if (!this.stopped) {
        this._emit("idle");
      }
    }
  }
}

export async function sendNonVisualWithBackoff(
  operation,
  { maxAttempts = 3, baseDelayMs = 100, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
