export type OcularValidationPhase = "frontal" | "eyes_left" | "eyes_right" | "front_return";
export type OcularMetricSummary = { mean: number | null; min: number | null; max: number | null };
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
  storage: "volatile_memory_only";
  raw_landmarks_retained: false;
};
export const OCULAR_VALIDATION_PHASES: readonly Readonly<{ id: OcularValidationPhase; label: string }>[];
export class OcularLocalValidationSession {
  constructor();
  reset(): void;
  selectPhase(phase: OcularValidationPhase): OcularValidationSummary;
  record(features: Record<string, number | null>): OcularValidationSummary;
  snapshot(): OcularValidationSummary;
}
