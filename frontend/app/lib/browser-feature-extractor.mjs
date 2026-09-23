import { createLocalFaceDetector } from "./mediapipe-face-detector.mjs";
import { createMeasuredFaceLandmarker } from "./measured-face-landmarker.mjs";

const clamp01 = (value) => Math.min(1, Math.max(0, value));
export const OCULAR_FEATURES_V2_ENABLED =
  process.env.NEXT_PUBLIC_OCULAR_FEATURES_V2?.trim().toLowerCase() !== "false";

const pointFor = (landmarks, type) => {
  const landmark = landmarks?.find((item) => item?.type === type);
  const point = landmark?.locations?.[0];
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
};

export function summarizeDetectedFace(face, frameWidth, frameHeight) {
  const box = face?.boundingBox;
  if (!box || frameWidth <= 0 || frameHeight <= 0) return null;
  const centerX = (box.x + box.width / 2) / frameWidth;
  const centerY = (box.y + box.height / 2) / frameHeight;
  const leftEye = pointFor(face.landmarks, "leftEye");
  const rightEye = pointFor(face.landmarks, "rightEye");
  const nose = pointFor(face.landmarks, "nose");
  const eyeSpan = leftEye && rightEye ? Math.abs(rightEye.x - leftEye.x) / frameWidth : null;
  const roll = leftEye && rightEye
    ? Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) / Math.PI
    : null;
  const gazeX = nose && leftEye && rightEye
    ? clamp01((nose.x - Math.min(leftEye.x, rightEye.x)) / Math.max(1, Math.abs(rightEye.x - leftEye.x)))
    : null;
  const edgeMargin = Math.min(box.x, box.y, frameWidth - box.x - box.width, frameHeight - box.y - box.height);
  const ocular = face?.ocular || {};
  const irisAvailable = ocular.iris_available === 1
    && [ocular.left_iris_x, ocular.left_iris_y, ocular.right_iris_x, ocular.right_iris_y]
      .every((value) => Number.isFinite(value));

  return {
    face_present: 1,
    face_count: 1,
    face_center_x: clamp01(centerX),
    face_center_y: clamp01(centerY),
    face_width: clamp01(box.width / frameWidth),
    face_height: clamp01(box.height / frameHeight),
    eye_span: eyeSpan === null ? null : clamp01(eyeSpan),
    head_roll: roll,
    head_yaw_proxy: Number.isFinite(ocular.head_yaw_proxy) ? clamp01(ocular.head_yaw_proxy) : gazeX,
    head_pitch_proxy: Number.isFinite(ocular.head_pitch_proxy) ? clamp01(ocular.head_pitch_proxy) : null,
    left_iris_x: irisAvailable ? clamp01(ocular.left_iris_x) : null,
    left_iris_y: irisAvailable ? clamp01(ocular.left_iris_y) : null,
    right_iris_x: irisAvailable ? clamp01(ocular.right_iris_x) : null,
    right_iris_y: irisAvailable ? clamp01(ocular.right_iris_y) : null,
    binocular_gaze_x: irisAvailable && Number.isFinite(ocular.binocular_gaze_x) ? clamp01(ocular.binocular_gaze_x) : null,
    binocular_gaze_y: irisAvailable && Number.isFinite(ocular.binocular_gaze_y) ? clamp01(ocular.binocular_gaze_y) : null,
    eye_openness: irisAvailable && Number.isFinite(ocular.eye_openness) ? clamp01(ocular.eye_openness) : null,
    iris_agreement: irisAvailable && Number.isFinite(ocular.iris_agreement) ? clamp01(ocular.iris_agreement) : null,
    iris_available: irisAvailable ? 1 : 0,
    // Compatibility only: v1 used this name for nose-versus-eyes head yaw.
    gaze_horizontal_proxy: gazeX,
    face_edge_margin: clamp01(edgeMargin / Math.min(frameWidth, frameHeight)),
    detection_confidence: Number.isFinite(face.confidence) ? clamp01(face.confidence) : null,
    pose_available: roll === null ? 0 : 1,
    gaze_available: gazeX === null ? 0 : 1,
  };
}

async function createPreferredLocalAnalyzer() {
  if (!OCULAR_FEATURES_V2_ENABLED) return createLocalFaceDetector();
  try {
    return await createMeasuredFaceLandmarker();
  } catch {
    return createLocalFaceDetector();
  }
}

export function summarizeLuminance(imageData) {
  const data = imageData?.data;
  if (!data?.length) return { luminance_mean: null, luminance_std: null };
  const pixelCount = data.length / 4;
  const stride = Math.max(1, Math.floor(pixelCount / 1024));
  let count = 0;
  let sum = 0;
  let squared = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += stride) {
    const offset = pixel * 4;
    const luminance = (0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]) / 255;
    sum += luminance;
    squared += luminance * luminance;
    count += 1;
  }
  const mean = sum / count;
  return { luminance_mean: mean, luminance_std: Math.sqrt(Math.max(0, squared / count - mean * mean)) };
}

export class BrowserFeatureExtractor {
  constructor({ detectorFactory, canvasFactory } = {}) {
    this.detectorFactory = detectorFactory || createPreferredLocalAnalyzer;
    this.canvasFactory = canvasFactory || (() => document.createElement("canvas"));
    this.detector = null;
    this.canvas = null;
    this.closed = false;
  }

  async extract(video) {
    if (this.closed) throw new Error("extractor_closed");
    const width = Number(video?.videoWidth || 0);
    const height = Number(video?.videoHeight || 0);
    if (!width || !height) return this.unobservable("video_not_ready", width, height);
    if (!this.detector) {
      try {
        this.detector = await this.detectorFactory();
      } catch {
        return this.unobservable("detector_unavailable", width, height);
      }
    }
    if (!this.detector) return this.unobservable("detector_unavailable", width, height);

    this.canvas ||= this.canvasFactory();
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext("2d", { willReadFrequently: false });
    if (!context) return this.unobservable("canvas_unavailable", width, height);
    context.drawImage(video, 0, 0, width, height);

    try {
      const faces = await this.detector.detect(this.canvas);
      if (!faces?.length) return this.unobservable("face_absent", width, height);
      const features = summarizeDetectedFace(faces[0], width, height);
      if (!features) return this.unobservable("invalid_detection", width, height);
      const luminance = typeof context.getImageData === "function"
        ? summarizeLuminance(context.getImageData(0, 0, width, height))
        : { luminance_mean: null, luminance_std: null };
      return {
        extractor_version: this.detector.backend || "browser-face-detector-v1",
        captured_at: new Date().toISOString(),
        frame: { width, height },
        features: { ...features, ...luminance },
        quality: {
          observable: true,
          ocular_observable: features.iris_available === 1,
          confidence: features.detection_confidence,
          reason: null,
          ocular_reason: features.iris_available === 1 ? null : "iris_unavailable",
        },
        ...(this.detector.performanceSummary ? { performance: this.detector.performanceSummary() } : {}),
      };
    } catch {
      return this.unobservable("detector_error", width, height);
    }
  }

  unobservable(reason, width, height) {
    return {
      extractor_version: "browser-face-detector-v1",
      captured_at: new Date().toISOString(),
      frame: { width, height },
      features: {
        face_present: reason === "face_absent" ? 0 : null,
        face_count: reason === "face_absent" ? 0 : null,
      },
      quality: { observable: false, reason },
      ...(this.detector?.performanceSummary ? { performance: this.detector.performanceSummary() } : {}),
    };
  }

  close() {
    this.closed = true;
    this.detector?.close?.();
    this.detector = null;
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvas.remove?.();
      this.canvas = null;
    }
  }
}

export function cameraConstraints(deviceId) {
  return {
    audio: false,
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15, max: 24 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
    },
  };
}
