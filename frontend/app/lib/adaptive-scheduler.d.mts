import type { EdgeProfileName } from "./edge-profiles.mjs";

export type SchedulerInput = {
  latencyBucket: "under_50" | "50_to_99" | "100_to_249" | "250_plus" | "unknown";
  energyBucket: "charging" | "low" | "normal" | "saver" | "unknown";
  networkBucket: "offline" | "slow" | "standard" | "fast" | "unknown";
  cpuLoadBucket: "normal" | "busy" | "saturated" | "unknown";
  coverage: number | null;
  uncertainty: number | null;
  qualityAllowed: boolean;
  consentGranted: boolean;
  privacyAllowed: boolean;
};
export type SchedulerDecision = {
  enabled: boolean;
  profile: EdgeProfileName;
  sampleIntervalMs: number | null;
  inferenceLocation: "local_device" | "local_fallback" | "disabled";
  changed: boolean;
  reason: string;
  at: string;
  metrics: SchedulerInput | null;
};
export const ADAPTIVE_SCHEDULER_POLICY: Readonly<Record<string, number | string>>;
export class AdaptiveScheduler {
  constructor(options?: { initialProfile?: EdgeProfileName; now?: () => number; policy?: Record<string, number> });
  profile: EdgeProfileName;
  evaluate(input: SchedulerInput): SchedulerDecision;
  drainDecisions(): SchedulerDecision[];
}
