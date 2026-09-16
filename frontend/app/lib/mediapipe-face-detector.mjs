export const MEDIAPIPE_WASM_BASE = "/vendor/mediapipe/wasm";
export const MEDIAPIPE_FACE_MODEL = "/vendor/mediapipe/models/blaze_face_short_range.tflite";

const normalizedLabel = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "");

export function adaptMediaPipeDetection(detection, frameWidth = 1, frameHeight = 1) {
  const box = detection?.boundingBox;
  if (!box) return null;
  const landmarks = [];
  for (const point of detection.keypoints || []) {
    const label = normalizedLabel(point.label || point.categoryName);
    const type = label.includes("lefteye")
      ? "leftEye"
      : label.includes("righteye")
        ? "rightEye"
        : label.includes("nose")
          ? "nose"
          : null;
    if (type && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      landmarks.push({ type, locations: [{ x: point.x * frameWidth, y: point.y * frameHeight }] });
    }
  }
  return {
    boundingBox: {
      x: box.originX,
      y: box.originY,
      width: box.width,
      height: box.height,
    },
    landmarks,
    confidence: detection.categories?.[0]?.score,
  };
}

export async function createMediaPipeFaceDetector() {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  const detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MEDIAPIPE_FACE_MODEL },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5,
  });
  return {
    backend: "mediapipe-tasks-vision-1.0.1",
    detect(source) {
      const timestamp = globalThis.performance?.now?.() ?? Date.now();
      return (detector.detectForVideo(source, timestamp).detections || [])
        .map((detection) => adaptMediaPipeDetection(detection, source.width, source.height))
        .filter(Boolean);
    },
    close() {
      detector.close();
    },
  };
}

export async function createLocalFaceDetector() {
  const NativeDetector = globalThis.FaceDetector;
  if (NativeDetector) {
    try {
      const detector = new NativeDetector({ fastMode: true, maxDetectedFaces: 1 });
      detector.backend = "browser-face-detector-v1";
      return detector;
    } catch {}
  }
  return createMediaPipeFaceDetector();
}
