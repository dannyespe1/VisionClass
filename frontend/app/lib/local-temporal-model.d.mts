export type EvidenceState = "off_task_evidence" | "task_oriented_evidence" | "no_observable";
export type TemporalEvent = { timestamp_ms: number; observable: boolean; probability: number | null };
export type TemporalOutput = {
  model_version: string | null;
  evidence_state: EvidenceState;
  posterior: Record<"off_task_evidence" | "task_oriented_evidence", number>;
  uncertainty: number;
  reset_reason: string | null;
  allow_intervention: false;
  interpretation: "observable_evidence_not_internal_attention";
  execution_location: "local_device" | "local_fallback";
};
export const LOCAL_TEMPORAL_MODEL_ENABLED: boolean;
export const LOCAL_TEMPORAL_FORMAT: "visionclass-temporal-web-v1";
export const LOCAL_TEMPORAL_ARTIFACT_URL: string;
export const LOCAL_TEMPORAL_MANIFEST_URL: string;
export class LocalTemporalEngine {
  constructor(payload: unknown);
  reset(): void;
  update(event: TemporalEvent): TemporalOutput;
}
export class SafeLocalTemporalFallback {
  constructor(reason?: string);
  reset(): void;
  update(event?: unknown): TemporalOutput;
}
export function validateLocalTemporalArtifact(payload: unknown): unknown;
export function sha256Hex(bytes: BufferSource, cryptoImpl?: Crypto): Promise<string>;
export function loadLocalTemporalModel(options?: {
  enabled?: boolean;
  artifactUrl?: string;
  manifestUrl?: string;
  origin?: string;
  fetchImpl?: typeof fetch;
  cryptoImpl?: Crypto;
  allowEngineeringArtifact?: boolean;
}): Promise<{
  status: "ready" | "fallback";
  reason: string | null;
  engine: LocalTemporalEngine | SafeLocalTemporalFallback;
  manifest?: Record<string, unknown>;
}>;
