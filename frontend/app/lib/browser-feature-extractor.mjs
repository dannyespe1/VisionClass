const clamp01 = (value) => Math.min(1, Math.max(0, value));

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

  return {
    face_present: 1,
    face_count: 1,
    face_center_x: clamp01(centerX),
    face_center_y: clamp01(centerY),
    face_width: clamp01(box.width / frameWidth),
    face_height: clamp01(box.height / frameHeight),
    eye_span: eyeSpan === null ? null : clamp01(eyeSpan),
    head_roll: roll,
    gaze_horizontal_proxy: gazeX,
    pose_available: roll === null ? 0 : 1,
    gaze_available: gazeX === null ? 0 : 1,
  };
}

export class BrowserFeatureExtractor {
  constructor({ detectorFactory, canvasFactory } = {}) {
    this.detectorFactory = detectorFactory || (() => {
      const Detector = globalThis.FaceDetector;
      if (!Detector) return null;
      return new Detector({ fastMode: true, maxDetectedFaces: 1 });
    });
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
    if (!this.detector) this.detector = this.detectorFactory();
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
      return {
        extractor_version: "browser-face-detector-v1",
        captured_at: new Date().toISOString(),
        frame: { width, height },
        features,
        quality: { observable: true, reason: null },
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
