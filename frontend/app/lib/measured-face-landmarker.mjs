import { EdgeExecutionBenchmark } from "./edge-execution-benchmark.mjs";
import { createMediaPipeFaceLandmarker, OCULAR_EXTRACTOR_VERSION } from "./mediapipe-face-landmarker.mjs";

class WorkerFaceLandmarker {
  constructor(worker) {
    this.worker = worker;
    this.nextId = 1;
    this.pending = new Map();
    worker.addEventListener("message", (event) => {
      const request = this.pending.get(event.data?.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      if (event.data.ok) request.resolve(event.data.faces || []);
      else request.reject(new Error(event.data.error || "worker_detection_failed"));
    });
    worker.addEventListener("error", () => {
      for (const request of this.pending.values()) request.reject(new Error("worker_unavailable"));
      this.pending.clear();
    });
  }

  async detect(source) {
    const bitmap = await createImageBitmap(source);
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type: "detect", bitmap }, [bitmap]);
    });
  }

  close() {
    this.worker.postMessage({ type: "close" });
    this.worker.terminate();
    for (const request of this.pending.values()) request.reject(new Error("worker_closed"));
    this.pending.clear();
  }
}

const defaultWorkerFactory = () => new Worker(
  new URL("./mediapipe-face-landmarker.worker.mjs", import.meta.url),
  { type: "module", name: "visionclass-ocular-edge" },
);

export const OCULAR_WORKER_BENCHMARK_ENABLED =
  process.env.NEXT_PUBLIC_OCULAR_WORKER_BENCHMARK?.trim().toLowerCase() !== "false";

export async function createMeasuredFaceLandmarker({
  mainFactory = createMediaPipeFaceLandmarker,
  workerFactory = defaultWorkerFactory,
  benchmark = new EdgeExecutionBenchmark(),
  now = () => performance.now(),
  workerBenchmarkEnabled = OCULAR_WORKER_BENCHMARK_ENABLED,
} = {}) {
  const main = await mainFactory();
  let worker = null;
  if (workerBenchmarkEnabled && typeof globalThis.Worker === "function" && typeof globalThis.createImageBitmap === "function") {
    try {
      worker = new WorkerFaceLandmarker(workerFactory());
    } catch {}
  }

  return {
    get backend() {
      const selected = benchmark.selectedLane || (worker ? "measuring" : "main");
      return `${OCULAR_EXTRACTOR_VERSION}-${selected}`;
    },
    async detect(source) {
      const requestedLane = worker ? benchmark.nextLane() : "main";
      const lane = requestedLane === "worker" && worker ? "worker" : "main";
      const startedAt = now();
      const eventLoopLag = new Promise((resolve) => {
        const scheduledAt = now();
        setTimeout(() => resolve(Math.max(0, now() - scheduledAt)), 0);
      });
      let faces;
      if (lane === "worker") {
        faces = await worker.detect(source);
      } else {
        faces = await main.detect(source);
      }
      const mainThreadMs = await eventLoopLag;
      benchmark.record(lane, {
        totalMs: now() - startedAt,
        mainThreadMs,
        observable: Array.isArray(faces) && faces.length > 0,
      });
      return faces;
    },
    performanceSummary() {
      return benchmark.summary();
    },
    close() {
      main.close?.();
      worker?.close();
      worker = null;
    },
  };
}
