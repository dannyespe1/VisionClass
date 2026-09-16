import type { EdgeProfileName } from "./edge-profiles.mjs";

export type DeviceBudgetPayload = {
  session_id: number;
  profile: EdgeProfileName;
  profile_generation: number;
  device_class: "constrained" | "standard" | "capable" | "unknown";
  fps_bucket: "under_5" | "5_to_9" | "10_to_14" | "15_plus" | "unknown";
  latency_bucket: "under_50" | "50_to_99" | "100_to_249" | "250_plus" | "unknown";
  memory_bucket: "up_to_2" | "3_to_4" | "5_to_8" | "over_8" | "unknown";
  network_bucket: "offline" | "slow" | "standard" | "fast" | "unknown";
  cpu_load_bucket: "normal" | "busy" | "saturated" | "unknown";
  energy_bucket: "charging" | "low" | "normal" | "saver" | "unknown";
  sample_count: number;
  invalid_sample_count: number;
};
export function bucketFps(value: unknown): DeviceBudgetPayload["fps_bucket"];
export function bucketLatency(value: unknown): DeviceBudgetPayload["latency_bucket"];
export function bucketMemory(value: unknown): DeviceBudgetPayload["memory_bucket"];
export function bucketNetwork(effectiveType?: string, online?: boolean): DeviceBudgetPayload["network_bucket"];
export function bucketEnergy(value?: { level?: number | null; charging?: boolean | null; saver?: boolean }): DeviceBudgetPayload["energy_bucket"];
export function classifyDevice(value: {
  memoryBucket: DeviceBudgetPayload["memory_bucket"];
  cpuLoadBucket: DeviceBudgetPayload["cpu_load_bucket"];
}): DeviceBudgetPayload["device_class"];
export class DeviceBudgetCollector {
  constructor(options?: { minSamples?: number; minWindowMs?: number; now?: () => number });
  reset(): void;
  record(value: { at?: number; latencyMs: number }): boolean;
  take(value?: {
    sessionId?: number;
    profile?: EdgeProfileName;
    profileGeneration?: number;
    deviceMemory?: number;
    effectiveType?: string;
    online?: boolean;
    energy?: { level?: number | null; charging?: boolean | null; saver?: boolean };
  }, force?: boolean): DeviceBudgetPayload | null;
}
