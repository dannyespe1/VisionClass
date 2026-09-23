export type EdgeExecutionSummary = {
  selected_lane: "main" | "worker" | null;
  samples_per_lane: number;
  lanes: Record<string, { samples: number; total_ms_p50: number | null; total_ms_p95: number | null; main_thread_ms_p95: number | null; coverage: number | null }>;
};

export type BrowserFeatureSample = {
  extractor_version: string;
  captured_at: string;
  frame: { width: number; height: number };
  features: Record<string, number | null>;
  quality: { observable: boolean; ocular_observable?: boolean; confidence?: number | null; reason: string | null; ocular_reason?: string | null };
  performance?: EdgeExecutionSummary | null;
};

export type BrowserDetectedFace = {
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence?: number;
  landmarks?: Array<{ type: string; locations?: Array<{ x: number; y: number }> }>;
  ocular?: Record<string, number | null>;
};

export type BrowserFaceDetector = {
  detect(source: CanvasImageSource): Promise<BrowserDetectedFace[]>;
  close?: () => void;
};

export class BrowserFeatureExtractor {
  constructor(options?: { detectorFactory?: () => BrowserFaceDetector | Promise<BrowserFaceDetector | null> | null; canvasFactory?: () => HTMLCanvasElement });
  extract(video: HTMLVideoElement): Promise<BrowserFeatureSample>;
  close(): void;
}

export function cameraConstraints(deviceId?: string): MediaStreamConstraints;
export function summarizeDetectedFace(face: BrowserDetectedFace, frameWidth: number, frameHeight: number): Record<string, number | null> | null;
export function summarizeLuminance(imageData: ImageData): { luminance_mean: number | null; luminance_std: number | null };
