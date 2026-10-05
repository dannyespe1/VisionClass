export type CalibrationReuseStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CalibrationReuseContext = {
  participantId: number;
  cameraId: string;
  calibrationVersion: string;
};

export type CalibrationReuseProof = {
  participant_id: number;
  camera_id: string;
  calibration_version: string;
  reuse_token: string;
  valid_until: string;
};

export const OCULAR_CALIBRATION_REUSE_STORAGE_KEY: string;
export function readOcularCalibrationReuse(
  storage: CalibrationReuseStorage | null | undefined,
  context: CalibrationReuseContext,
  now?: number,
): Pick<CalibrationReuseProof, "reuse_token" | "valid_until"> | null;
export function writeOcularCalibrationReuse(
  storage: CalibrationReuseStorage | null | undefined,
  proof: CalibrationReuseProof,
): boolean;
export function clearOcularCalibrationReuse(
  storage: CalibrationReuseStorage | null | undefined,
): void;
