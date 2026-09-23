import { createMediaPipeFaceLandmarker } from "./mediapipe-face-landmarker.mjs";

let detectorPromise = null;

const detector = () => {
  detectorPromise ||= createMediaPipeFaceLandmarker();
  return detectorPromise;
};

self.addEventListener("message", async (event) => {
  const { id, type, bitmap } = event.data || {};
  if (type === "close") {
    const active = await detectorPromise?.catch(() => null);
    active?.close?.();
    detectorPromise = null;
    self.close();
    return;
  }
  if (type !== "detect" || !bitmap) return;
  try {
    const active = await detector();
    const faces = await active.detect(bitmap);
    bitmap.close?.();
    self.postMessage({ id, ok: true, faces });
  } catch (error) {
    bitmap.close?.();
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : "worker_detection_failed" });
  }
});
