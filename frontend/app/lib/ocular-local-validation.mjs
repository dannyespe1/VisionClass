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

export const OCULAR_MIN_VALID_SAMPLES = 40;
const HISTOGRAM_BINS = 20;
const TRIM_FRACTION = 0.10;

const emptyMetric = () => ({
  count: 0,
  sum: 0,
  min: null,
  max: null,
  bins: Array.from({ length: HISTOGRAM_BINS }, () => ({ count: 0, sum: 0 })),
});

const robustMean = (metric) => {
  if (!metric.count) return null;
  let trimLow = Math.floor(metric.count * TRIM_FRACTION);
  let trimHigh = trimLow;
  let retainedCount = 0;
  let retainedSum = 0;
  const bins = metric.bins.map((bin) => ({ ...bin }));

  for (const bin of bins) {
    if (!trimLow || !bin.count) continue;
    const removed = Math.min(trimLow, bin.count);
    const average = bin.sum / bin.count;
    bin.count -= removed;
    bin.sum -= average * removed;
    trimLow -= removed;
  }
  for (let index = bins.length - 1; index >= 0; index -= 1) {
    const bin = bins[index];
    if (!trimHigh || !bin.count) continue;
    const removed = Math.min(trimHigh, bin.count);
    const average = bin.sum / bin.count;
    bin.count -= removed;
    bin.sum -= average * removed;
    trimHigh -= removed;
  }
  for (const bin of bins) {
    retainedCount += bin.count;
    retainedSum += bin.sum;
  }
  return retainedCount ? retainedSum / retainedCount : metric.sum / metric.count;
};

const summarizeMetric = (metric) => ({
  mean: metric.count ? metric.sum / metric.count : null,
  robust_mean: robustMean(metric),
  min: metric.min,
  max: metric.max,
});

const calibrationSnapshot = (phases) => {
  const counts = Object.fromEntries(Object.entries(phases).map(([name, phase]) => [name, phase.sampleCount]));
  const enoughSamples = Object.values(counts).every((count) => count >= OCULAR_MIN_VALID_SAMPLES);
  if (!enoughSamples) {
    return {
      status: "collecting",
      reason: "minimum_samples_pending",
      minimum_samples_per_phase: OCULAR_MIN_VALID_SAMPLES,
      counts,
    };
  }

  const value = (phase) => robustMean(phases[phase].metrics.binocular_gaze_x);
  const frontal = value("frontal");
  const left = value("eyes_left");
  const right = value("eyes_right");
  const returned = value("front_return");
  const center = (frontal + returned) / 2;
  const separation = Math.abs(left - right);
  const centerDrift = Math.abs(frontal - returned);
  const leftOffset = left - center;
  const rightOffset = right - center;
  const centerIsBetweenDirections = Math.sign(leftOffset) !== Math.sign(rightOffset);
  const stable = separation >= 0.10 && centerDrift <= 0.08 && centerIsBetweenDirections;

  return {
    status: stable ? "ready" : "insufficient",
    reason: stable
      ? null
      : !centerIsBetweenDirections
        ? "center_not_between_directions"
        : separation < 0.10
          ? "directional_separation_too_small"
          : "center_drift_too_large",
    minimum_samples_per_phase: OCULAR_MIN_VALID_SAMPLES,
    counts,
    center,
    center_drift: centerDrift,
    directional_separation: separation,
    left_threshold: center + leftOffset * 0.60,
    right_threshold: center + rightOffset * 0.60,
    polarity: left > right ? "increasing_x_is_left" : "decreasing_x_is_left",
    aggregation: "histogram_trimmed_mean_10pct",
  };
};

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
    if (phase.sampleCount >= OCULAR_MIN_VALID_SAMPLES) return this.snapshot();
    phase.sampleCount += 1;
    for (const [name, value] of Object.entries(values)) {
      const metric = phase.metrics[name];
      metric.count += 1;
      metric.sum += value;
      metric.min = metric.min === null ? value : Math.min(metric.min, value);
      metric.max = metric.max === null ? value : Math.max(metric.max, value);
      const binIndex = Math.min(HISTOGRAM_BINS - 1, Math.floor(value * HISTOGRAM_BINS));
      metric.bins[binIndex].count += 1;
      metric.bins[binIndex].sum += value;
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
      calibration: calibrationSnapshot(this.phases),
      storage: "volatile_memory_only",
      raw_landmarks_retained: false,
    };
  }
}
