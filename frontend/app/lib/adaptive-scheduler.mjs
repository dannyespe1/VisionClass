const PROFILES = ["low", "balanced", "high"];
const PROFILE_INTERVAL_MS = Object.freeze({ low: 1000, balanced: 500, high: 250 });
const ALLOWED_BUCKETS = Object.freeze({
  latency: new Set(["under_50", "50_to_99", "100_to_249", "250_plus", "unknown"]),
  energy: new Set(["charging", "low", "normal", "saver", "unknown"]),
  network: new Set(["offline", "slow", "standard", "fast", "unknown"]),
  cpu: new Set(["normal", "busy", "saturated", "unknown"]),
});

const finiteUnit = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const rounded = (value) => finiteUnit(value) ? Math.round(value * 100) / 100 : null;
const step = (profile, direction) => PROFILES[Math.max(0, Math.min(PROFILES.length - 1, PROFILES.indexOf(profile) + direction))];

export const ADAPTIVE_SCHEDULER_POLICY = Object.freeze({
  latencyBudgetBucket: "50_to_99",
  minimumCoverage: 0.7,
  recoveryCoverage: 0.85,
  maximumUncertainty: 0.7,
  recoveryUncertainty: 0.45,
  degradeWindows: 2,
  recoverWindows: 3,
  minimumDwellMs: 30000,
  decisionLogLimit: 100,
});

function sanitize(input) {
  if (!input || !ALLOWED_BUCKETS.latency.has(input.latencyBucket)
      || !ALLOWED_BUCKETS.energy.has(input.energyBucket)
      || !ALLOWED_BUCKETS.network.has(input.networkBucket)
      || !ALLOWED_BUCKETS.cpu.has(input.cpuLoadBucket)) return null;
  return {
    latencyBucket: input.latencyBucket,
    energyBucket: input.energyBucket,
    networkBucket: input.networkBucket,
    cpuLoadBucket: input.cpuLoadBucket,
    coverage: rounded(input.coverage),
    uncertainty: rounded(input.uncertainty),
    qualityAllowed: input.qualityAllowed === true,
    consentGranted: input.consentGranted === true,
    privacyAllowed: input.privacyAllowed === true,
  };
}

function pressureReason(metrics, policy) {
  if (!metrics.qualityAllowed || metrics.coverage === null || metrics.coverage < policy.minimumCoverage) return "insufficient_signal";
  if (metrics.uncertainty !== null && metrics.uncertainty > policy.maximumUncertainty) return "high_uncertainty";
  if (metrics.energyBucket === "low" || metrics.energyBucket === "saver") return "energy_constraint";
  if (metrics.latencyBucket === "250_plus" || metrics.cpuLoadBucket === "saturated") return "resource_overload";
  if (metrics.latencyBucket === "100_to_249" || metrics.cpuLoadBucket === "busy") return "latency_pressure";
  return null;
}

function recoveryReady(metrics, policy) {
  return metrics.qualityAllowed
    && metrics.coverage !== null && metrics.coverage >= policy.recoveryCoverage
    && metrics.uncertainty !== null && metrics.uncertainty <= policy.recoveryUncertainty
    && ["under_50", "50_to_99"].includes(metrics.latencyBucket)
    && ["normal", "charging"].includes(metrics.energyBucket)
    && metrics.cpuLoadBucket === "normal";
}

export class AdaptiveScheduler {
  constructor({
    initialProfile = "balanced",
    now = () => Date.now(),
    policy = {},
  } = {}) {
    this.policy = { ...ADAPTIVE_SCHEDULER_POLICY, ...policy };
    this.now = now;
    this.profile = PROFILES.includes(initialProfile) ? initialProfile : "balanced";
    this.changedAt = this.now();
    this.badWindows = 0;
    this.healthyWindows = 0;
    this.decisions = [];
  }

  evaluate(input) {
    const timestamp = this.now();
    const metrics = sanitize(input);
    if (!metrics || !metrics.consentGranted || !metrics.privacyAllowed) {
      const reason = !metrics ? "invalid_metrics" : !metrics.consentGranted ? "consent_not_valid" : "privacy_constraint";
      return this.#record({
        enabled: false,
        profile: "low",
        sampleIntervalMs: null,
        inferenceLocation: "disabled",
        changed: false,
        reason,
        metrics,
      }, timestamp);
    }

    const pressure = pressureReason(metrics, this.policy);
    const recover = recoveryReady(metrics, this.policy);
    this.badWindows = pressure ? this.badWindows + 1 : 0;
    this.healthyWindows = recover ? this.healthyWindows + 1 : 0;
    const dwellSatisfied = timestamp - this.changedAt >= this.policy.minimumDwellMs;
    let requested = this.profile;
    let reason = pressure || (recover ? "healthy_recovery_candidate" : "stable_or_insufficient_recovery_evidence");

    if (pressure && this.badWindows >= this.policy.degradeWindows && dwellSatisfied) {
      requested = step(this.profile, -1);
      reason = requested === this.profile ? `safe_floor_${pressure}` : pressure;
    } else if (recover && this.healthyWindows >= this.policy.recoverWindows && dwellSatisfied) {
      requested = step(this.profile, 1);
      reason = requested === this.profile ? "healthy_at_ceiling" : "sustained_recovery";
    } else if (!dwellSatisfied && (pressure || recover)) {
      reason = "minimum_dwell";
    } else if (pressure) {
      reason = "hysteresis_hold";
    }

    const changed = requested !== this.profile;
    if (changed) {
      this.profile = requested;
      this.changedAt = timestamp;
      this.badWindows = 0;
      this.healthyWindows = 0;
    }
    const inferenceLocation = metrics.qualityAllowed
      && metrics.coverage !== null && metrics.coverage >= this.policy.minimumCoverage
      && metrics.uncertainty !== null && metrics.uncertainty <= this.policy.maximumUncertainty
      ? "local_device"
      : "local_fallback";
    return this.#record({
      enabled: true,
      profile: this.profile,
      sampleIntervalMs: PROFILE_INTERVAL_MS[this.profile],
      inferenceLocation,
      changed,
      reason: metrics.networkBucket === "offline" && reason === "stable_or_insufficient_recovery_evidence"
        ? "offline_local_only"
        : reason,
      metrics,
    }, timestamp);
  }

  #record(decision, timestamp) {
    const record = { ...decision, at: new Date(timestamp).toISOString() };
    this.decisions.push(record);
    if (this.decisions.length > this.policy.decisionLogLimit) this.decisions.shift();
    return record;
  }

  drainDecisions() {
    return this.decisions.splice(0);
  }
}
