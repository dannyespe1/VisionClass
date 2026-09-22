export const MASKED_GRU_SHADOW_ENABLED =
  process.env.NEXT_PUBLIC_MASKED_GRU_SHADOW?.trim().toLowerCase() === "true";

export const MASKED_GRU_ARTIFACT_URL = "/models/masked-gru-observable-evidence-v1-synthetic.json";
export const MASKED_GRU_MANIFEST_URL = "/models/masked-gru-observable-evidence-v1-synthetic.manifest.json";

const SCHEMA_VERSION = "visionclass-masked-gru-artifact-v1";
const FEATURE_CONTRACT = "normalized-features-v1";
const FEATURE_NAMES = Object.freeze([
  "face_center_x",
  "face_center_y",
  "face_width",
  "face_height",
  "eye_span",
  "head_roll",
  "gaze_horizontal_proxy",
  "pose_available",
  "gaze_available",
]);
const FEATURE_BOUNDS = Object.freeze({
  face_center_x: [0, 1],
  face_center_y: [0, 1],
  face_width: [0, 1],
  face_height: [0, 1],
  eye_span: [0, 1],
  head_roll: [-1, 1],
  gaze_horizontal_proxy: [0, 1],
  pose_available: [0, 1],
  gaze_available: [0, 1],
});

const sigmoid = (value) => 1 / (1 + Math.exp(-value));
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);

function sameOriginUrl(value, origin) {
  const resolved = new URL(value, origin);
  if (resolved.origin !== origin) throw new Error("cross_origin_artifact_rejected");
  return resolved.toString();
}

function numericArray(value, length, label) {
  if (!Array.isArray(value) || value.length !== length || value.some((item) => typeof item !== "number" || !Number.isFinite(item))) {
    throw new Error(`invalid_${label}`);
  }
  return value;
}

function numericMatrix(value, rows, columns, label) {
  if (!Array.isArray(value) || value.length !== rows) throw new Error(`invalid_${label}`);
  return value.map((row) => numericArray(row, columns, label));
}

export function validateMaskedGRUArtifact(artifact) {
  if (!artifact || artifact.schema_version !== SCHEMA_VERSION) throw new Error("unsupported_artifact_schema");
  if (artifact.feature_contract !== FEATURE_CONTRACT) throw new Error("feature_contract_mismatch");
  if (JSON.stringify(artifact.feature_names) !== JSON.stringify(FEATURE_NAMES)) throw new Error("feature_order_mismatch");
  const architecture = artifact.architecture || {};
  if (architecture.family !== "masked_gru" || architecture.input_size !== 9 || architecture.hidden_size !== 8 || architecture.output_size !== 1) {
    throw new Error("unsupported_architecture");
  }
  const lifecycle = artifact.lifecycle || {};
  if (lifecycle.mode !== "shadow_only" || lifecycle.active !== false || lifecycle.allow_intervention !== false || lifecycle.requires_raw_media !== false) {
    throw new Error("unsafe_lifecycle");
  }
  const threshold = artifact.decision?.threshold;
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error("invalid_threshold");
  if (!Number.isInteger(artifact.sequence_policy?.maximum_gap_ms) || artifact.sequence_policy.maximum_gap_ms <= 0) throw new Error("invalid_maximum_gap");
  const weights = artifact.weights || {};
  numericMatrix(weights["cell.weight_ih"], 24, 9, "weight_ih");
  numericMatrix(weights["cell.weight_hh"], 24, 8, "weight_hh");
  numericArray(weights["cell.bias_ih"], 24, "bias_ih");
  numericArray(weights["cell.bias_hh"], 24, "bias_hh");
  numericMatrix(weights["head.weight"], 1, 8, "head_weight");
  numericArray(weights["head.bias"], 1, "head_bias");
  return artifact;
}

function featureVector(event) {
  if (event?.device?.preprocessing_version !== FEATURE_CONTRACT) throw new Error("feature_contract_mismatch");
  return FEATURE_NAMES.map((name) => {
    const value = event?.features?.[name];
    const [low, high] = FEATURE_BOUNDS[name];
    if (typeof value !== "number" || !Number.isFinite(value) || value < low || value > high) {
      throw new Error(`invalid_feature:${name}`);
    }
    return value;
  });
}

export class MaskedGRUShadowEngine {
  constructor(payload, { artifactSha256 = null } = {}) {
    this.artifact = validateMaskedGRUArtifact(payload);
    this.artifactSha256 = artifactSha256;
    this.hidden = Array(8).fill(0);
    this.lastTimestamp = null;
    this.lastProfileGeneration = null;
  }

  reset() {
    this.hidden = Array(8).fill(0);
    this.lastTimestamp = null;
    this.lastProfileGeneration = null;
  }

  update(event) {
    const timestamp = Date.parse(event?.captured_at);
    if (!Number.isFinite(timestamp)) throw new Error("invalid_captured_at");
    if (this.lastTimestamp !== null && timestamp <= this.lastTimestamp) throw new Error("event_out_of_order");
    const profileGeneration = event?.features?.profile_generation;
    if (!Number.isFinite(profileGeneration)) throw new Error("invalid_profile_generation");
    const reset = this.lastTimestamp === null
      || timestamp - this.lastTimestamp > this.artifact.sequence_policy.maximum_gap_ms
      || profileGeneration !== this.lastProfileGeneration;
    if (reset) this.hidden = Array(8).fill(0);
    this.lastTimestamp = timestamp;
    this.lastProfileGeneration = profileGeneration;

    if (event?.quality?.observable !== true) {
      this.hidden = Array(8).fill(0);
      return this.#output(null, "no_observable", reset ? "segment_reset" : "quality_reset");
    }

    const input = featureVector(event);
    const previous = [...this.hidden];
    const weights = this.artifact.weights;
    const inputLinear = weights["cell.weight_ih"].map((row, index) => dot(row, input) + weights["cell.bias_ih"][index]);
    const hiddenLinear = weights["cell.weight_hh"].map((row, index) => dot(row, previous) + weights["cell.bias_hh"][index]);
    const resetGate = Array.from({ length: 8 }, (_, index) => sigmoid(inputLinear[index] + hiddenLinear[index]));
    const updateGate = Array.from({ length: 8 }, (_, index) => sigmoid(inputLinear[index + 8] + hiddenLinear[index + 8]));
    const candidate = Array.from({ length: 8 }, (_, index) => Math.tanh(inputLinear[index + 16] + resetGate[index] * hiddenLinear[index + 16]));
    this.hidden = candidate.map((value, index) => (1 - updateGate[index]) * value + updateGate[index] * previous[index]);
    const logit = dot(weights["head.weight"][0], this.hidden) + weights["head.bias"][0];
    const probability = sigmoid(logit);
    const state = probability >= this.artifact.decision.threshold
      ? this.artifact.decision.positive_state
      : this.artifact.decision.negative_state;
    return this.#output(probability, state, reset ? "segment_reset" : null);
  }

  #output(probability, state, resetReason) {
    return {
      model_version: this.artifact.artifact_version,
      artifact_sha256: this.artifactSha256,
      probability,
      evidence_state: state,
      reset_reason: resetReason,
      mode: "shadow_only",
      active: false,
      allow_intervention: false,
      interpretation: "observable_evidence_not_internal_attention",
      execution_location: "local_device",
    };
  }
}

export class SafeMaskedGRUShadowFallback {
  constructor(reason = "shadow_model_unavailable") {
    this.reason = reason;
  }

  reset() {}

  update() {
    return {
      model_version: null,
      artifact_sha256: null,
      probability: null,
      evidence_state: "no_observable",
      reset_reason: this.reason,
      mode: "shadow_only",
      active: false,
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

export async function loadMaskedGRUShadow({
  enabled = MASKED_GRU_SHADOW_ENABLED,
  artifactUrl = MASKED_GRU_ARTIFACT_URL,
  manifestUrl = MASKED_GRU_MANIFEST_URL,
  origin = globalThis.location?.origin || "http://localhost",
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
} = {}) {
  if (!enabled) return { status: "disabled", reason: "feature_disabled", engine: new SafeMaskedGRUShadowFallback("feature_disabled") };
  try {
    if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
    const resolvedManifestUrl = sameOriginUrl(manifestUrl, origin);
    const resolvedArtifactUrl = sameOriginUrl(artifactUrl, origin);
    const manifestResponse = await fetchImpl(resolvedManifestUrl, { cache: "no-store", credentials: "same-origin" });
    if (!manifestResponse.ok) throw new Error("manifest_fetch_failed");
    const manifest = await manifestResponse.json();
    if (manifest.manifest_version !== "masked-gru-shadow-manifest-v1" || manifest.deployment_eligibility !== "shadow_only") throw new Error("incompatible_manifest");
    if (manifest.signature_status !== "not_signed_synthetic_engineering_only") throw new Error("unsupported_signature_status");
    if (!Number.isInteger(manifest.byte_length) || manifest.byte_length <= 0 || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error("invalid_integrity_manifest");
    if (!new URL(resolvedArtifactUrl).pathname.endsWith(`/${manifest.artifact_filename}`)) throw new Error("artifact_filename_mismatch");
    const artifactResponse = await fetchImpl(resolvedArtifactUrl, { cache: "no-store", credentials: "same-origin" });
    if (!artifactResponse.ok) throw new Error("artifact_fetch_failed");
    const bytes = await artifactResponse.arrayBuffer();
    if (bytes.byteLength !== manifest.byte_length) throw new Error("artifact_length_mismatch");
    if (await sha256Hex(bytes, cryptoImpl) !== manifest.sha256) throw new Error("artifact_hash_mismatch");
    const artifact = JSON.parse(new TextDecoder().decode(bytes));
    return {
      status: "ready",
      reason: null,
      engine: new MaskedGRUShadowEngine(artifact, { artifactSha256: manifest.sha256 }),
      manifest,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "shadow_model_load_failed";
    return { status: "fallback", reason, engine: new SafeMaskedGRUShadowFallback(reason) };
  }
}
