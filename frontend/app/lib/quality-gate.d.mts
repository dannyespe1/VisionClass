export type QualityReason = "no_data" | "face_absent" | "low_illumination" | "partial_face" | "occluded" | "low_confidence" | "insufficient_data" | "frame_loss" | "insufficient_continuity";
export const QUALITY_THRESHOLDS_V1: Readonly<Record<string, number>>;
export const QUALITY_MESSAGES: Readonly<Record<QualityReason, string>>;
export function evaluateFrame(sample: any, thresholds?: typeof QUALITY_THRESHOLDS_V1): { observable: boolean; reason: QualityReason | null; confidence: number | null; message: string | null };
export function evaluateWindow(samples: any[], thresholds?: typeof QUALITY_THRESHOLDS_V1): { observable: boolean; allow_inference: boolean; allow_intervention: false; reason: QualityReason | null; observable_ratio: number; sample_count: number; confidence: number | null; message: string | null };
