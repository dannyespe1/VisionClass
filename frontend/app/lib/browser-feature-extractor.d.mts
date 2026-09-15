export type BrowserFeatureSample = {
  extractor_version: "browser-face-detector-v1";
  captured_at: string;
  frame: { width: number; height: number };
  features: Record<string, number | null>;
  quality: { observable: boolean; confidence?: number | null; reason: string | null };
};

export type BrowserDetectedFace = {
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence?: number;
  landmarks?: Array<{ type: string; locations?: Array<{ x: number; y: number }> }>;
};

export type BrowserFaceDetector = {
  detect(source: CanvasImageSource): Promise<BrowserDetectedFace[]>;
  close?: () => void;
};

export class BrowserFeatureExtractor {
  constructor(options?: { detectorFactory?: () => BrowserFaceDetector | null; canvasFactory?: () => HTMLCanvasElement });
  extract(video: HTMLVideoElement): Promise<BrowserFeatureSample>;
  close(): void;
}

export function cameraConstraints(deviceId?: string): MediaStreamConstraints;
export function summarizeDetectedFace(face: BrowserDetectedFace, frameWidth: number, frameHeight: number): Record<string, number | null> | null;
export function summarizeLuminance(imageData: ImageData): { luminance_mean: number | null; luminance_std: number | null };
