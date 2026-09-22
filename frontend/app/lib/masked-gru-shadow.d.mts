export const MASKED_GRU_SHADOW_ENABLED: boolean;

export type MaskedGRUShadowResult = {
  model_version: string | null;
  artifact_sha256: string | null;
  probability: number | null;
  evidence_state: "task_oriented_evidence" | "off_task_evidence" | "no_observable";
  reset_reason: string | null;
  mode: "shadow_only";
  active: false;
  allow_intervention: false;
  interpretation: "observable_evidence_not_internal_attention";
  execution_location: "local_device" | "local_fallback";
};

export class MaskedGRUShadowEngine {
  constructor(payload: unknown, options?: { artifactSha256?: string | null });
  reset(): void;
  update(event: unknown): MaskedGRUShadowResult;
}

export class SafeMaskedGRUShadowFallback {
  constructor(reason?: string);
  reset(): void;
  update(event?: unknown): MaskedGRUShadowResult;
}

export function loadMaskedGRUShadow(options?: Record<string, unknown>): Promise<{
  status: "ready" | "fallback" | "disabled";
  reason: string | null;
  engine: MaskedGRUShadowEngine | SafeMaskedGRUShadowFallback;
  manifest?: Record<string, unknown>;
}>;
