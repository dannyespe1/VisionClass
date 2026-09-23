import { MEDIAPIPE_WASM_BASE } from "./mediapipe-face-detector.mjs";

export const MEDIAPIPE_FACE_LANDMARKER_MODEL = "/vendor/mediapipe/models/face_landmarker.task";
export const OCULAR_EXTRACTOR_VERSION = "mediapipe-face-landmarker-1.0.1-ocular-v2";

const INDEX = Object.freeze({
  nose: 1,
  chin: 152,
  rightEye: Object.freeze({ corners: [33, 133], lids: [159, 145], iris: [468, 469, 470, 471, 472] }),
  leftEye: Object.freeze({ corners: [362, 263], lids: [386, 374], iris: [473, 474, 475, 476, 477] }),
});

const finitePoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const averagePoint = (points) => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

function eyeGeometry(landmarks, definition) {
  const corners = definition.corners.map((index) => landmarks[index]);
  const lids = definition.lids.map((index) => landmarks[index]);
  const irisPoints = definition.iris.map((index) => landmarks[index]);
  if (![...corners, ...lids, ...irisPoints].every(finitePoint)) return null;

  const orderedCorners = [...corners].sort((a, b) => a.x - b.x);
  const orderedLids = [...lids].sort((a, b) => a.y - b.y);
  const iris = averagePoint(irisPoints);
  const horizontal = {
    x: orderedCorners[1].x - orderedCorners[0].x,
    y: orderedCorners[1].y - orderedCorners[0].y,
  };
  const vertical = {
    x: orderedLids[1].x - orderedLids[0].x,
    y: orderedLids[1].y - orderedLids[0].y,
  };
  const horizontalSquared = horizontal.x ** 2 + horizontal.y ** 2;
  const verticalSquared = vertical.x ** 2 + vertical.y ** 2;
  if (horizontalSquared <= 0 || verticalSquared <= 0) return null;

  const irisFromCorner = { x: iris.x - orderedCorners[0].x, y: iris.y - orderedCorners[0].y };
  const irisFromTop = { x: iris.x - orderedLids[0].x, y: iris.y - orderedLids[0].y };
  return {
    center: averagePoint(corners),
    iris,
    x: clamp01((irisFromCorner.x * horizontal.x + irisFromCorner.y * horizontal.y) / horizontalSquared),
    y: clamp01((irisFromTop.x * vertical.x + irisFromTop.y * vertical.y) / verticalSquared),
    openness: clamp01(distance(lids[0], lids[1]) / Math.max(distance(corners[0], corners[1]), 1e-6) / 0.45),
  };
}

const legacyLandmark = (type, point, frameWidth, frameHeight) => ({
  type,
  locations: [{ x: point.x * frameWidth, y: point.y * frameHeight }],
});

export function summarizeFaceLandmarks(landmarks, frameWidth = 1, frameHeight = 1) {
  if (!Array.isArray(landmarks) || landmarks.length < 478 || frameWidth <= 0 || frameHeight <= 0) return null;
  const finiteLandmarks = landmarks.filter(finitePoint);
  if (finiteLandmarks.length !== landmarks.length) return null;
  const left = eyeGeometry(landmarks, INDEX.leftEye);
  const right = eyeGeometry(landmarks, INDEX.rightEye);
  const nose = landmarks[INDEX.nose];
  const chin = landmarks[INDEX.chin];
  if (!left || !right || !finitePoint(nose) || !finitePoint(chin)) return null;

  const minX = Math.min(...finiteLandmarks.map((point) => point.x));
  const maxX = Math.max(...finiteLandmarks.map((point) => point.x));
  const minY = Math.min(...finiteLandmarks.map((point) => point.y));
  const maxY = Math.max(...finiteLandmarks.map((point) => point.y));
  const eyeMid = averagePoint([left.center, right.center]);
  const eyeSpan = distance(left.center, right.center);
  const faceHeight = Math.max(maxY - minY, 1e-6);
  const headYaw = clamp01((nose.x - Math.min(left.center.x, right.center.x)) / Math.max(Math.abs(right.center.x - left.center.x), 1e-6));
  const headPitch = clamp01((nose.y - eyeMid.y) / Math.max(chin.y - eyeMid.y, faceHeight * 0.25));
  const gazeX = clamp01((left.x + right.x) / 2);
  const gazeY = clamp01((left.y + right.y) / 2);

  return {
    boundingBox: {
      x: minX * frameWidth,
      y: minY * frameHeight,
      width: (maxX - minX) * frameWidth,
      height: (maxY - minY) * frameHeight,
    },
    landmarks: [
      legacyLandmark("leftEye", left.center, frameWidth, frameHeight),
      legacyLandmark("rightEye", right.center, frameWidth, frameHeight),
      legacyLandmark("nose", nose, frameWidth, frameHeight),
    ],
    confidence: null,
    ocular: {
      left_iris_x: left.x,
      left_iris_y: left.y,
      right_iris_x: right.x,
      right_iris_y: right.y,
      binocular_gaze_x: gazeX,
      binocular_gaze_y: gazeY,
      eye_openness: clamp01((left.openness + right.openness) / 2),
      iris_agreement: clamp01(1 - (Math.abs(left.x - right.x) + Math.abs(left.y - right.y)) / 2),
      iris_available: 1,
      head_yaw_proxy: headYaw,
      head_pitch_proxy: headPitch,
      normalized_eye_span: clamp01(eyeSpan),
    },
  };
}

export async function createMediaPipeFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  let landmarker;
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  } catch {
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }
  return {
    backend: OCULAR_EXTRACTOR_VERSION,
    detect(source) {
      const timestamp = globalThis.performance?.now?.() ?? Date.now();
      const result = landmarker.detectForVideo(source, timestamp);
      return (result.faceLandmarks || [])
        .map((face) => summarizeFaceLandmarks(face, source.width, source.height))
        .filter(Boolean);
    },
    close() {
      landmarker.close();
    },
  };
}
