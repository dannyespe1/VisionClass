const finite = (value) => typeof value === "number" && Number.isFinite(value);

export function bucketFps(value) {
  if (!finite(value) || value < 0 || value > 240) return "unknown";
  if (value < 5) return "under_5";
  if (value < 10) return "5_to_9";
  if (value < 15) return "10_to_14";
  return "15_plus";
}

export function bucketLatency(value) {
  if (!finite(value) || value < 0 || value > 30000) return "unknown";
  if (value < 50) return "under_50";
  if (value < 100) return "50_to_99";
  if (value < 250) return "100_to_249";
  return "250_plus";
}

export function bucketMemory(value) {
  if (!finite(value) || value <= 0 || value > 64) return "unknown";
  if (value <= 2) return "up_to_2";
  if (value <= 4) return "3_to_4";
  if (value <= 8) return "5_to_8";
  return "over_8";
}

export function bucketNetwork(effectiveType, online = true) {
  if (!online) return "offline";
  if (effectiveType === "slow-2g" || effectiveType === "2g") return "slow";
  if (effectiveType === "3g") return "standard";
  if (effectiveType === "4g") return "fast";
  return "unknown";
}

export function bucketEnergy({ level = null, charging = null, saver = false } = {}) {
  if (saver === true) return "saver";
  if (charging === true) return "charging";
  if (!finite(level) || level < 0 || level > 1) return "unknown";
  return level < 0.2 ? "low" : "normal";
}

export function classifyDevice({ memoryBucket, cpuLoadBucket }) {
  if (memoryBucket === "unknown" || cpuLoadBucket === "unknown") return "unknown";
  if (["up_to_2", "3_to_4"].includes(memoryBucket) || cpuLoadBucket === "saturated") return "constrained";
  if (["over_8"].includes(memoryBucket) && cpuLoadBucket === "normal") return "capable";
  return "standard";
}

export class DeviceBudgetCollector {
  constructor({ minSamples = 5, minWindowMs = 30000, now = () => performance.now() } = {}) {
    this.minSamples = minSamples;
    this.minWindowMs = minWindowMs;
    this.now = now;
    this.reset();
  }

  reset() {
    this.startedAt = this.now();
    this.lastAt = null;
    this.intervals = [];
    this.latencies = [];
    this.invalid = 0;
  }

  record({ at = this.now(), latencyMs }) {
    if (!finite(at) || !finite(latencyMs) || latencyMs < 0 || latencyMs > 30000) {
      this.invalid += 1;
      return false;
    }
    if (this.lastAt !== null) {
      const interval = at - this.lastAt;
      if (interval <= 0 || interval > 60000) this.invalid += 1;
      else this.intervals.push(interval);
    }
    this.lastAt = at;
    this.latencies.push(latencyMs);
    return true;
  }

  take({ sessionId, profile, profileGeneration, deviceMemory, effectiveType, online, energy } = {}, force = false) {
    const elapsed = this.now() - this.startedAt;
    if (!force && (this.latencies.length < this.minSamples || elapsed < this.minWindowMs)) return null;
    if (!Number.isInteger(sessionId) || sessionId <= 0 || !["low", "balanced", "high"].includes(profile)) return null;
    const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const avgInterval = average(this.intervals);
    const avgLatency = average(this.latencies);
    const fps = avgInterval ? 1000 / avgInterval : null;
    const loadRatio = avgInterval && avgLatency !== null ? avgLatency / avgInterval : null;
    const cpuLoadBucket = loadRatio === null ? "unknown" : loadRatio < 0.5 ? "normal" : loadRatio < 0.9 ? "busy" : "saturated";
    const memoryBucket = bucketMemory(deviceMemory);
    const payload = {
      session_id: sessionId,
      profile,
      profile_generation: Number.isInteger(profileGeneration) && profileGeneration >= 0 ? profileGeneration : 0,
      device_class: classifyDevice({ memoryBucket, cpuLoadBucket }),
      fps_bucket: bucketFps(fps),
      latency_bucket: bucketLatency(avgLatency),
      memory_bucket: memoryBucket,
      network_bucket: bucketNetwork(effectiveType, online),
      cpu_load_bucket: cpuLoadBucket,
      energy_bucket: bucketEnergy(energy),
      sample_count: Math.min(120, this.latencies.length),
      invalid_sample_count: Math.min(120, this.invalid),
    };
    this.reset();
    return payload;
  }
}
