import { apiFetch } from "./api";

export type ConsentPurpose = "local_processing" | "derived_persistence" | "research";
export type ConsentStatus = {
  enabled: boolean;
  text_approved: boolean;
  current_version: string;
  capture_allowed: boolean;
  teacher_access: false;
  images_stored: false;
};

export async function getConsentStatus(token: string) {
  return apiFetch<ConsentStatus>("/api/consents/status/", {}, token);
}

export async function recordConsent(token: string, choices: Record<ConsentPurpose, boolean>) {
  const current = await getConsentStatus(token);
  if (!current.enabled || !current.text_approved) {
    throw new Error("El texto de consentimiento está pendiente de aprobación.");
  }
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await Promise.all((Object.keys(choices) as ConsentPurpose[]).map((purpose) =>
    apiFetch("/api/consents/", {
      method: "POST",
      body: JSON.stringify({
        version: current.current_version,
        purpose,
        action: choices[purpose] ? "grant" : "decline",
        expires_at: choices[purpose] ? expiresAt : null,
      }),
    }, token),
  ));
  return getConsentStatus(token);
}

export async function revokeCaptureConsent(token: string) {
  const current = await getConsentStatus(token);
  await Promise.all((["local_processing", "derived_persistence"] as ConsentPurpose[]).map((purpose) =>
    apiFetch("/api/consents/", {
      method: "POST",
      body: JSON.stringify({ version: current.current_version, purpose, action: "revoke" }),
    }, token),
  ));
}
