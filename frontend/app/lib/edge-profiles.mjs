export const EDGE_PROFILES = Object.freeze({
  low: Object.freeze({ name: "low", width: 320, height: 240, frameRate: 5, sampleIntervalMs: 1000, features: ["face", "quality"], inferenceLocation: "edge" }),
  balanced: Object.freeze({ name: "balanced", width: 640, height: 480, frameRate: 10, sampleIntervalMs: 500, features: ["face", "quality", "pose"], inferenceLocation: "edge" }),
  high: Object.freeze({ name: "high", width: 1280, height: 720, frameRate: 15, sampleIntervalMs: 250, features: ["face", "quality", "pose", "gaze"], inferenceLocation: "edge" }),
});
export const SAFE_EDGE_PROFILE = "low";
const rank = { low: 0, balanced: 1, high: 2 };

export function profileForEnvironment({ hardwareConcurrency = 0, deviceMemory = 0, batteryLevel = 1, hidden = false } = {}) {
  if (hidden || batteryLevel < 0.2 || hardwareConcurrency <= 2) return "low";
  if (hardwareConcurrency >= 8 && deviceMemory >= 8) return "high";
  return "balanced";
}

export function constraintsForProfile(profileName = SAFE_EDGE_PROFILE, deviceId) {
  const profile = EDGE_PROFILES[profileName] || EDGE_PROFILES[SAFE_EDGE_PROFILE];
  return {
    audio: false,
    video: {
      width: { ideal: profile.width, max: profile.width },
      height: { ideal: profile.height, max: profile.height },
      frameRate: { ideal: profile.frameRate, max: profile.frameRate },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
    },
  };
}

export class EdgeProfileController {
  constructor({ maxProfile = "high", remoteSelection = false, minimumSwitchMs = 10000, now = () => Date.now() } = {}) {
    this.maxProfile = EDGE_PROFILES[maxProfile] ? maxProfile : SAFE_EDGE_PROFILE;
    this.remoteSelection = remoteSelection;
    this.minimumSwitchMs = minimumSwitchMs;
    this.now = now;
    this.current = SAFE_EDGE_PROFILE;
    this.generation = 0;
    this.changedAt = 0;
    this.telemetry = [];
  }

  select(requested, { source = "local", reason = "manual" } = {}) {
    const timestamp = this.now();
    if (source === "remote" && !this.remoteSelection) return { accepted: false, profile: this.current, reason: "remote_not_consented", generation: this.generation };
    const known = EDGE_PROFILES[requested] ? requested : SAFE_EDGE_PROFILE;
    const constrained = rank[known] > rank[this.maxProfile] ? this.maxProfile : known;
    if (constrained !== this.current && this.changedAt && timestamp - this.changedAt < this.minimumSwitchMs) {
      return { accepted: false, profile: this.current, reason: "switch_cooldown", generation: this.generation };
    }
    if (constrained === this.current) return { accepted: true, changed: false, profile: this.current, reason, generation: this.generation };
    const previous = this.current;
    this.current = constrained;
    this.generation += 1;
    this.changedAt = timestamp;
    this.telemetry.push({ from: previous, to: constrained, reason, source, at: new Date(timestamp).toISOString(), generation: this.generation });
    return { accepted: true, changed: true, profile: constrained, reason, generation: this.generation, resetWindow: true };
  }

  selectForEnvironment(environment) {
    return this.select(profileForEnvironment(environment), { source: "environment", reason: "device_capability" });
  }

  drainTelemetry() {
    return this.telemetry.splice(0);
  }
}
