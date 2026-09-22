export const MEDIAPIPE_WASM_BASE = "/vendor/mediapipe/wasm";
export const MEDIAPIPE_FACE_MODEL = "/vendor/mediapipe/models/blaze_face_short_range.tflite";

const normalizedLabel = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "");

const isFiniteKeypoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);

const toLandmark = (type, point, frameWidth, frameHeight) => ({
  type,
  locations: [{ x: point.x * frameWidth, y: point.y * frameHeight }],
});

export function adaptMediaPipeDetection(detection, frameWidth = 1, frameHeight = 1) {
  const box = detection?.boundingBox;
  if (!box) return null;
  const keypoints = Array.isArray(detection.keypoints) ? detection.keypoints : [];
  const landmarksByType = new Map();
  for (const point of keypoints) {
    const label = normalizedLabel(point.label || point.categoryName);
    const type = label.includes("lefteye")
      ? "leftEye"
      : label.includes("righteye")
        ? "rightEye"
        : label.includes("nose")
          ? "nose"
          : null;
    if (type && isFiniteKeypoint(point)) {
      landmarksByType.set(type, toLandmark(type, point, frameWidth, frameHeight));
    }
  }

  // BlazeFace returns six ordered keypoints, but the Web Tasks API declares
  // their labels optional and commonly omits them. The first two points are
  // the eyes and the third is the nose tip. Sorting the eyes by image x keeps
  // roll orientation stable for mirrored and non-mirrored camera previews.
  if (!landmarksByType.has("leftEye") && !landmarksByType.has("rightEye")) {
    const eyes = keypoints.slice(0, 2).filter(isFiniteKeypoint).sort((a, b) => a.x - b.x);
    if (eyes.length === 2) {
      landmarksByType.set("leftEye", toLandmark("leftEye", eyes[0], frameWidth, frameHeight));
      landmarksByType.set("rightEye", toLandmark("rightEye", eyes[1], frameWidth, frameHeight));
    }
  }
  if (!landmarksByType.has("nose") && isFiniteKeypoint(keypoints[2])) {
    landmarksByType.set("nose", toLandmark("nose", keypoints[2], frameWidth, frameHeight));
  }

  const landmarks = ["leftEye", "rightEye", "nose"]
    .map((type) => landmarksByType.get(type))
    .filter(Boolean);
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
