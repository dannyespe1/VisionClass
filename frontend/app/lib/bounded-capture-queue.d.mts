export type CaptureTransportState = "idle" | "queued" | "sending" | "stopped";
export type CaptureQueueSnapshot = {
  active: number;
  pending: number;
  outstanding: number;
  stopped: boolean;
  confirmed: number;
  failed: number;
  timedOut: number;
  replaced: number;
  obsolete: number;
  cancelled: number;
};
export type CaptureTaskContext = {
  signal: AbortSignal;
  idempotencyKey: string;
  sequence: number;
};
export type CaptureOutcome<T> =
  | { status: "confirmed"; sequence: number; value: T }
  | { status: "failed"; sequence: number; error: unknown }
  | { status: "timed_out" | "replaced" | "obsolete" | "cancelled"; sequence: number };

export class BoundedCaptureQueue {
  constructor(options?: {
    timeoutMs?: number;
    onState?: (state: CaptureTransportState, snapshot: CaptureQueueSnapshot) => void;
  });
  enqueue<T>(run: (context: CaptureTaskContext) => Promise<T>): Promise<CaptureOutcome<T>>;
  stop(): void;
  snapshot(): CaptureQueueSnapshot;
}

export function sendNonVisualWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    sleep?: (milliseconds: number) => Promise<void>;
  },
): Promise<T>;
