const fields = new Set(["contract_version", "event_id", "session_type", "session_id", "captured_at", "features", "quality", "device", "consent"]);
const purposes = new Set(["local_processing", "derived_persistence", "research"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateAttentionEventV2(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["event_v2.object"];
  for (const key of Object.keys(value)) if (!fields.has(key)) errors.push(`unknown.${key}`);
  for (const key of fields) if (key !== "device" && !(key in value)) errors.push(`missing.${key}`);
  if (value.contract_version !== "2.0") errors.push("contract_version");
  if (!uuid.test(value.event_id || "")) errors.push("event_id");
  if (value.session_type !== "course") errors.push("session_type");
  if (!Number.isInteger(value.session_id) || value.session_id < 1) errors.push("session_id");
  if (typeof value.captured_at !== "string" || Number.isNaN(Date.parse(value.captured_at))) errors.push("captured_at");
  if (!value.features || typeof value.features !== "object" || Object.values(value.features).some((item) => item !== null && typeof item !== "number")) errors.push("features");
  const quality = value.quality;
  if (!quality || typeof quality.observable !== "boolean" || (quality.confidence !== null && (typeof quality.confidence !== "number" || quality.confidence < 0 || quality.confidence > 1))) errors.push("quality");
  const consent = value.consent;
  if (!consent || typeof consent.version !== "string" || !consent.version || !Array.isArray(consent.purposes) || new Set(consent.purposes).size !== consent.purposes.length || consent.purposes.some((item) => !purposes.has(item))) errors.push("consent");
  return errors;
}
