export const LOCAL_TEMPORAL_MODEL_ENABLED =
  process.env.NEXT_PUBLIC_LOCAL_TEMPORAL_MODEL?.trim().toLowerCase() === "true";

export const LOCAL_TEMPORAL_FORMAT = "visionclass-temporal-web-v1";
export const LOCAL_TEMPORAL_ARTIFACT_URL = "/models/temporal-reference.v1.json";
export const LOCAL_TEMPORAL_MANIFEST_URL = "/models/temporal-reference.v1.manifest.json";

const EXPECTED_STATES = Object.freeze(["off_task_evidence", "task_oriented_evidence"]);
const NO_OBSERVABLE = "no_observable";

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!finiteNumber(total) || total <= 0) throw new Error("posterior_normalization_failed");
  return values.map((value) => value / total);
}

function entropy(values) {
  return -values.reduce((sum, value) => (value > 0 ? sum + value * Math.log(value) : sum), 0) / Math.log(values.length);
}

function validateProbabilityRows(initial, transition) {
  const closeToOne = (value) => Math.abs(value - 1) <= 1e-12;
  if (!closeToOne(initial.reduce((sum, value) => sum + value, 0))) throw new Error("invalid_initial_probability");
  if (!transition.every((row) => closeToOne(row.reduce((sum, value) => sum + value, 0)))) {
    throw new Error("invalid_transition_probability");
  }
}

export function validateLocalTemporalArtifact(payload) {
  if (!payload || payload.format_version !== LOCAL_TEMPORAL_FORMAT) throw new Error("unsupported_format_version");
  const artifact = payload.artifact;
  if (!artifact || artifact.artifact_version !== "observable-evidence-hmm-v1") throw new Error("unsupported_artifact_version");
  if (JSON.stringify(artifact.state_names) !== JSON.stringify(EXPECTED_STATES)) throw new Error("unsupported_state_contract");
  const initial = artifact.initial;
  const transition = artifact.transition;
  const means = artifact.emission_mean;
  const variances = artifact.emission_variance;
  if (!Array.isArray(initial) || initial.length !== 2 || !initial.every(finiteNumber)) throw new Error("invalid_initial_shape");
  if (!Array.isArray(transition) || transition.length !== 2 || !transition.every((row) => Array.isArray(row) && row.length === 2 && row.every(finiteNumber))) throw new Error("invalid_transition_shape");
  if (!Array.isArray(means) || means.length !== 2 || !means.every(finiteNumber)) throw new Error("invalid_emission_mean");
  if (!Array.isArray(variances) || variances.length !== 2 || !variances.every((value) => finiteNumber(value) && value > 0)) throw new Error("invalid_emission_variance");
  if (!Number.isInteger(artifact.config?.maximum_gap_ms) || artifact.config.maximum_gap_ms <= 0) throw new Error("invalid_maximum_gap");
  validateProbabilityRows(initial, transition);
  if (payload.execution?.quantized !== false || payload.execution?.raw_media_required !== false) throw new Error("unsupported_execution_contract");
  if (payload.eligibility?.active !== false || payload.eligibility?.allow_intervention !== false) throw new Error("unsafe_eligibility_contract");
  return payload;
}

export class LocalTemporalEngine {
  constructor(payload) {
    const validated = validateLocalTemporalArtifact(payload);
    this.artifact = validated.artifact;
    this.initial = [...this.artifact.initial];
    this.posterior = [...this.initial];
    this.lastTimestamp = null;
    this.segmentActive = false;
  }

  reset() {
    this.posterior = [...this.initial];
    this.lastTimestamp = null;
    this.segmentActive = false;
  }

  update(event) {
    const timestamp = event?.timestamp_ms;
    if (!Number.isInteger(timestamp) || timestamp < 0) throw new Error("invalid_timestamp_ms");
    if (this.lastTimestamp !== null && timestamp <= this.lastTimestamp) throw new Error("event_out_of_order");
    let resetReason = null;
    if (this.segmentActive && this.lastTimestamp !== null && timestamp - this.lastTimestamp > this.artifact.config.maximum_gap_ms) {
      this.posterior = [...this.initial];
      resetReason = "gap_reset";
    } else if (this.segmentActive) {
      this.posterior = [0, 1].map((to) =>
        this.posterior.reduce((sum, probability, from) => sum + probability * this.artifact.transition[from][to], 0),
      );
    }
    this.lastTimestamp = timestamp;

    if (event.observable !== true) {
      const output = this.#output(NO_OBSERVABLE, resetReason);
      this.posterior = [...this.initial];
      this.segmentActive = false;
      return output;
    }
    const probability = event.probability;
    if (!finiteNumber(probability) || probability < 0 || probability > 1) throw new Error("observable_event_requires_probability");
    const likelihood = this.artifact.emission_mean.map((mean, index) => {
      const variance = this.artifact.emission_variance[index];
      const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
      return Math.max(coefficient * Math.exp(-((probability - mean) ** 2) / (2 * variance)), Number.MIN_VALUE);
    });
    this.posterior = normalize(this.posterior.map((value, index) => value * likelihood[index]));
    this.segmentActive = true;
    const state = this.posterior[1] > this.posterior[0] ? EXPECTED_STATES[1] : EXPECTED_STATES[0];
    return this.#output(state, resetReason);
  }

  #output(evidenceState, resetReason) {
    return {
      model_version: this.artifact.artifact_version,
      evidence_state: evidenceState,
      posterior: Object.fromEntries(EXPECTED_STATES.map((state, index) => [state, this.posterior[index]])),
      uncertainty: entropy(this.posterior),
      reset_reason: resetReason,
      allow_intervention: false,
      interpretation: "observable_evidence_not_internal_attention",
      execution_location: "local_device",
    };
  }
}

export class SafeLocalTemporalFallback {
  constructor(reason = "local_model_unavailable") {
    this.reason = reason;
  }

  reset() {}

  update() {
    return {
      model_version: null,
      evidence_state: NO_OBSERVABLE,
      posterior: { off_task_evidence: 0.5, task_oriented_evidence: 0.5 },
      uncertainty: 1,
      reset_reason: this.reason,
      allow_intervention: false,
      interpretation: "observable_evidence_not_internal_attention",
      execution_location: "local_fallback",
    };
  }
}

export async function sha256Hex(bytes, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) throw new Error("webcrypto_unavailable");
  const digest = await cryptoImpl.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function sameOriginUrl(value, origin) {
  const resolved = new URL(value, origin);
  if (resolved.origin !== origin) throw new Error("cross_origin_artifact_rejected");
  return resolved.toString();
}

export async function loadLocalTemporalModel({
  enabled = LOCAL_TEMPORAL_MODEL_ENABLED,
  artifactUrl = LOCAL_TEMPORAL_ARTIFACT_URL,
  manifestUrl = LOCAL_TEMPORAL_MANIFEST_URL,
  origin = globalThis.location?.origin || "http://localhost",
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  allowEngineeringArtifact = false,
} = {}) {
  if (!enabled) return { status: "fallback", reason: "feature_disabled", engine: new SafeLocalTemporalFallback("feature_disabled") };
  try {
    if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
    const resolvedManifestUrl = sameOriginUrl(manifestUrl, origin);
    const resolvedArtifactUrl = sameOriginUrl(artifactUrl, origin);
    const manifestResponse = await fetchImpl(resolvedManifestUrl, { cache: "no-store", credentials: "same-origin" });
    if (!manifestResponse.ok) throw new Error("manifest_fetch_failed");
    const manifest = await manifestResponse.json();
    if (manifest.manifest_version !== "local-temporal-manifest-v1" || manifest.format_version !== LOCAL_TEMPORAL_FORMAT) throw new Error("incompatible_manifest");
    if (manifest.deployment_eligibility !== "engineering_parity_only" || manifest.signature_status !== "not_signed_engineering_only") throw new Error("unsupported_deployment_manifest");
    if (!allowEngineeringArtifact) throw new Error("engineering_artifact_not_enabled");
    if (!Number.isInteger(manifest.byte_length) || manifest.byte_length <= 0 || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error("invalid_integrity_manifest");
    if (!new URL(resolvedArtifactUrl).pathname.endsWith(`/${manifest.artifact_filename}`)) throw new Error("artifact_filename_mismatch");
    const artifactResponse = await fetchImpl(resolvedArtifactUrl, { cache: "no-store", credentials: "same-origin" });
    if (!artifactResponse.ok) throw new Error("artifact_fetch_failed");
    const bytes = await artifactResponse.arrayBuffer();
    if (bytes.byteLength !== manifest.byte_length) throw new Error("artifact_length_mismatch");
    const digest = await sha256Hex(bytes, cryptoImpl);
    if (digest !== manifest.sha256) throw new Error("artifact_hash_mismatch");
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return { status: "ready", reason: null, engine: new LocalTemporalEngine(payload), manifest };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "local_model_load_failed";
    return { status: "fallback", reason, engine: new SafeLocalTemporalFallback(reason) };
  }
}
