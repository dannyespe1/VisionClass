export const OCULAR_FEATURE_CONTRACT_VERSION = "normalized-ocular-features-v2";
export const OCULAR_FEATURE_NAMES = Object.freeze([
  "face_center_x",
  "face_center_y",
  "face_width",
  "face_height",
  "eye_span",
  "head_roll",
  "head_yaw_proxy",
  "head_pitch_proxy",
  "left_iris_x",
  "left_iris_y",
  "right_iris_x",
  "right_iris_y",
  "binocular_gaze_x",
  "binocular_gaze_y",
  "eye_openness",
]);

const BOUNDS = Object.freeze({
  face_center_x: [0, 1], face_center_y: [0, 1], face_width: [0, 1], face_height: [0, 1], eye_span: [0, 1],
  head_roll: [-1, 1], head_yaw_proxy: [0, 1], head_pitch_proxy: [0, 1],
  left_iris_x: [0, 1], left_iris_y: [0, 1], right_iris_x: [0, 1], right_iris_y: [0, 1],
  binocular_gaze_x: [0, 1], binocular_gaze_y: [0, 1], eye_openness: [0, 1],
});

export function buildLocalOcularVector(sample) {
  const raw = sample?.features || {};
  const ocularObservable = sample?.quality?.ocular_observable === true && raw.iris_available === 1;
  if (!ocularObservable) return { observable: false, reason: sample?.quality?.ocular_reason || "iris_unavailable", vector: null };
  const vector = [];
  for (const name of OCULAR_FEATURE_NAMES) {
    const value = raw[name];
    const [low, high] = BOUNDS[name];
    if (typeof value !== "number" || !Number.isFinite(value) || value < low || value > high) {
      return { observable: false, reason: `invalid_feature:${name}`, vector: null };
    }
    vector.push(value);
  }
  if (raw.eye_openness < 0.15) return { observable: false, reason: "eyes_closed", vector: null };
  if (typeof raw.iris_agreement === "number" && raw.iris_agreement < 0.5) {
    return { observable: false, reason: "iris_disagreement", vector: null };
  }
  return { observable: true, reason: null, vector, contract_version: OCULAR_FEATURE_CONTRACT_VERSION };
}
