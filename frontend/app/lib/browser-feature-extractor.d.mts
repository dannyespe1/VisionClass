export type BrowserFeatureSample = {
  extractor_version: "browser-face-detector-v1";
  captured_at: string;
  frame: { width: number; height: number };
  features: Record<string, number | null>;
  quality: { observable: boolean; confidence?: number | null; reason: string | null };
};

export class BrowserFeatureExtractor {
  constructor(options?: { detectorFactory?: () => any; canvasFactory?: () => any });
  extract(video: HTMLVideoElement): Promise<BrowserFeatureSample>;
  close(): void;
}

export function cameraConstraints(deviceId?: string): MediaStreamConstraints;
export function summarizeDetectedFace(face: any, frameWidth: number, frameHeight: number): Record<string, number | null> | null;
export function summarizeLuminance(imageData: ImageData): { luminance_mean: number | null; luminance_std: number | null };
