export type AttentionEventV2 = {
  contract_version: "2.0";
  event_id: string;
  session_type: "course";
  session_id: number;
  captured_at: string;
  features: Record<string, number | null>;
  quality: { observable: boolean; confidence: number | null; reason?: string | null };
  device?: {
    class?: "desktop" | "laptop" | "tablet" | "mobile" | "unknown";
    browser_family?: string;
    extractor_version?: string;
    preprocessing_version?: string;
    execution_profile?: "low" | "balanced" | "high";
  };
  consent: { version: string; purposes: Array<"local_processing" | "derived_persistence" | "research"> };
};
export function validateAttentionEventV2(value: unknown): string[];
