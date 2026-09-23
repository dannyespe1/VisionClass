export type OcularValidationPhase = "frontal" | "eyes_left" | "eyes_right" | "front_return";
export type OcularMetricSummary = { mean: number | null; robust_mean: number | null; min: number | null; max: number | null };
export type OcularPhaseSummary = {
  sample_count: number;
  binocular_gaze_x: OcularMetricSummary;
  binocular_gaze_y: OcularMetricSummary;
  eye_openness: OcularMetricSummary;
  iris_agreement: OcularMetricSummary;
};
export type OcularValidationSummary = {
  active_phase: OcularValidationPhase;
  total_samples: number;
  phases: Record<OcularValidationPhase, OcularPhaseSummary>;
  calibration: {
    status: "collecting" | "ready" | "insufficient";
    reason: string | null;
    minimum_samples_per_phase: number;
    counts: Record<OcularValidationPhase, number>;
    center?: number;
    center_drift?: number;
    directional_separation?: number;
    left_threshold?: number;
    right_threshold?: number;
    polarity?: "increasing_x_is_left" | "decreasing_x_is_left";
    aggregation?: "histogram_trimmed_mean_10pct";
  };
  storage: "volatile_memory_only";
  raw_landmarks_retained: false;
};
export const OCULAR_MIN_VALID_SAMPLES: number;
export const OCULAR_VALIDATION_PHASES: readonly Readonly<{ id: OcularValidationPhase; label: string }>[];
export class OcularLocalValidationSession {
  constructor();
  reset(): void;
  selectPhase(phase: OcularValidationPhase): OcularValidationSummary;
  record(features: Record<string, number | null>): OcularValidationSummary;
  snapshot(): OcularValidationSummary;
}
