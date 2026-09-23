export const OCULAR_VALIDATION_PHASES = Object.freeze([
  Object.freeze({ id: "frontal", label: "Frontal" }),
  Object.freeze({ id: "eyes_left", label: "Ojos izquierda" }),
  Object.freeze({ id: "eyes_right", label: "Ojos derecha" }),
  Object.freeze({ id: "front_return", label: "Regreso frontal" }),
]);

const METRICS = Object.freeze([
  "binocular_gaze_x",
  "binocular_gaze_y",
  "eye_openness",
  "iris_agreement",
]);

const emptyMetric = () => ({ count: 0, sum: 0, min: null, max: null });

const summarizeMetric = (metric) => ({
  mean: metric.count ? metric.sum / metric.count : null,
  min: metric.min,
  max: metric.max,
});

export class OcularLocalValidationSession {
  constructor() {
    this.reset();
  }

  reset() {
    this.activePhase = "frontal";
    this.phases = Object.fromEntries(OCULAR_VALIDATION_PHASES.map(({ id }) => [
      id,
      { sampleCount: 0, metrics: Object.fromEntries(METRICS.map((name) => [name, emptyMetric()])) },
    ]));
  }

  selectPhase(phase) {
    if (!this.phases[phase]) throw new Error("invalid_ocular_validation_phase");
    this.activePhase = phase;
    return this.snapshot();
  }

  record(features) {
    if (features?.iris_available !== 1) return this.snapshot();
    const values = Object.fromEntries(METRICS.map((name) => [name, features?.[name]]));
    if (Object.values(values).some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)) {
      return this.snapshot();
    }
    const phase = this.phases[this.activePhase];
    phase.sampleCount += 1;
    for (const [name, value] of Object.entries(values)) {
      const metric = phase.metrics[name];
      metric.count += 1;
      metric.sum += value;
      metric.min = metric.min === null ? value : Math.min(metric.min, value);
      metric.max = metric.max === null ? value : Math.max(metric.max, value);
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      active_phase: this.activePhase,
      total_samples: Object.values(this.phases).reduce((sum, phase) => sum + phase.sampleCount, 0),
      phases: Object.fromEntries(Object.entries(this.phases).map(([name, phase]) => [name, {
        sample_count: phase.sampleCount,
        ...Object.fromEntries(Object.entries(phase.metrics).map(([metricName, metric]) => [metricName, summarizeMetric(metric)])),
      }])),
      storage: "volatile_memory_only",
      raw_landmarks_retained: false,
    };
  }
}
