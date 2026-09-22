import type { AttentionEventV2 } from "./event-contract.mjs";
import type { MaskedGRUShadowResult } from "./masked-gru-shadow.mjs";

export const EDGE_SHADOW_REPORT_INTERVAL_MS: number;
export function shouldReportEdgeShadow(
  lastReportedAt: number | null,
  capturedAt: string,
  intervalMs?: number,
): boolean;
export function shouldPersistNormalizedObservation(options: {
  edgeReportingEnabled: boolean;
  shadowEnabled: boolean;
}): boolean;
export function buildEdgeShadowReport(
  event: AttentionEventV2,
  result: MaskedGRUShadowResult,
  options?: { cryptoImpl?: Crypto; sampleCount?: number },
): Record<string, unknown>;
