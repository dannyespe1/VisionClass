export const BOUNDED_CAPTURE_QUEUE_ENABLED =
  process.env.NEXT_PUBLIC_BOUNDED_CAPTURE_QUEUE !== "false";

export const CAPTURE_DEADLINE_MS = Math.max(
  500,
  Number(process.env.NEXT_PUBLIC_CAPTURE_DEADLINE_MS || "4500"),
);

export const BROWSER_EXTRACTOR_ENABLED =
  process.env.NEXT_PUBLIC_BROWSER_EXTRACTOR?.trim().toLowerCase() === "true";

export const NORMALIZED_FEATURES_V1_ENABLED =
  process.env.NEXT_PUBLIC_NORMALIZED_FEATURES_V1?.trim().toLowerCase() === "true";

export const QUALITY_GATE_V1_ENABLED =
  process.env.NEXT_PUBLIC_QUALITY_GATE_V1?.trim().toLowerCase() === "true";

export const EDGE_PROFILES_ENABLED =
  process.env.NEXT_PUBLIC_EDGE_PROFILES?.trim().toLowerCase() === "true";

export const DEVICE_BUDGET_TELEMETRY_ENABLED =
  process.env.NEXT_PUBLIC_DEVICE_BUDGET_TELEMETRY?.trim().toLowerCase() === "true";

export const ADAPTIVE_SCHEDULER_ENABLED =
  process.env.NEXT_PUBLIC_ADAPTIVE_SCHEDULER?.trim().toLowerCase() === "true";

const configuredFixedProfile = process.env.NEXT_PUBLIC_EDGE_FIXED_PROFILE?.trim().toLowerCase();
export const EDGE_FIXED_PROFILE: "low" | "balanced" | "high" | null =
  configuredFixedProfile === "low" || configuredFixedProfile === "balanced" || configuredFixedProfile === "high"
    ? configuredFixedProfile
    : null;
