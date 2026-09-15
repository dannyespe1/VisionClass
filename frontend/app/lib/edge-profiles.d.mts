export type EdgeProfileName = "low" | "balanced" | "high";
export type EdgeProfile = { name: EdgeProfileName; width: number; height: number; frameRate: number; sampleIntervalMs: number; features: readonly string[]; inferenceLocation: "edge" };
export const EDGE_PROFILES: Readonly<Record<EdgeProfileName, EdgeProfile>>;
export const SAFE_EDGE_PROFILE: "low";
export function profileForEnvironment(value?: { hardwareConcurrency?: number; deviceMemory?: number; batteryLevel?: number; hidden?: boolean }): EdgeProfileName;
export function constraintsForProfile(profile?: EdgeProfileName, deviceId?: string): MediaStreamConstraints;
export class EdgeProfileController {
  constructor(options?: { maxProfile?: EdgeProfileName; remoteSelection?: boolean; minimumSwitchMs?: number; now?: () => number });
  current: EdgeProfileName;
  generation: number;
  select(requested: string, options?: { source?: "local" | "remote" | "environment"; reason?: string }): { accepted: boolean; changed?: boolean; profile: EdgeProfileName; reason: string; generation: number; resetWindow?: boolean };
  selectForEnvironment(value?: Parameters<typeof profileForEnvironment>[0]): ReturnType<EdgeProfileController["select"]>;
  drainTelemetry(): Array<{ from: EdgeProfileName; to: EdgeProfileName; reason: string; source: string; at: string; generation: number }>;
}
