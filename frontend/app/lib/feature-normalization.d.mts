import type { BrowserFeatureSample } from "./browser-feature-extractor.mjs";
import type { AttentionEventV2 } from "./event-contract.mjs";

export const FEATURE_CONTRACT_VERSION: "normalized-features-v1";
export const WINDOW_DURATION_MS: 5000;
export function normalizeBrowserSample(sample: BrowserFeatureSample, options?: { orientation?: 0 | 90 | 180 | 270; windowMs?: number }): {
  captured_at: string;
  window: { started_at: string; ended_at: string };
  features: Record<string, number | null>;
  quality: { observable: boolean; confidence: number | null; reason: string | null };
};
export function buildNormalizedEvent(sample: BrowserFeatureSample, context: {
  sessionId: number;
  consentVersion: string;
  purposes: string[];
  eventId?: string;
  orientation?: 0 | 90 | 180 | 270;
  windowMs?: number;
  deviceClass?: string;
  browserFamily?: string;
}): AttentionEventV2;
