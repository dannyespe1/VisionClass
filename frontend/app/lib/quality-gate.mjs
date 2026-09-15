export const QUALITY_THRESHOLDS_V1 = Object.freeze({
  minimumLuminance: 0.15,
  minimumFaceEdgeMargin: 0.02,
  minimumConfidence: 0.5,
  minimumFrames: 3,
  minimumObservableRatio: 0.6,
  maximumGapMs: 2500,
});

export const QUALITY_MESSAGES = Object.freeze({
  no_data: "Aún no hay datos suficientes para observar esta ventana.",
  face_absent: "No se detecta un rostro en el encuadre; puedes continuar sin activar la cámara.",
  low_illumination: "La iluminación no permite obtener una señal confiable.",
  partial_face: "El rostro aparece parcialmente fuera del encuadre.",
  occluded: "La señal facial está parcialmente cubierta o incompleta.",
  low_confidence: "La señal disponible tiene confianza insuficiente.",
  insufficient_data: "Se necesitan más muestras antes de interpretar esta ventana.",
  frame_loss: "La continuidad de la señal fue insuficiente.",
  insufficient_continuity: "La ventana no tiene suficiente señal observable.",
});

export function evaluateFrame(sample, thresholds = QUALITY_THRESHOLDS_V1) {
  const features = sample?.features;
  if (!features || features.face_present === null || features.face_present === undefined) return result(false, "no_data", null);
  if (features.face_present === 0) return result(false, "face_absent", sample?.quality?.confidence ?? null);
  if (features.luminance_mean !== null && features.luminance_mean !== undefined && features.luminance_mean < thresholds.minimumLuminance) return result(false, "low_illumination", sample?.quality?.confidence ?? null);
  if (features.face_edge_margin !== null && features.face_edge_margin !== undefined && features.face_edge_margin < thresholds.minimumFaceEdgeMargin) return result(false, "partial_face", sample?.quality?.confidence ?? null);
  if (features.pose_available === 0 && features.gaze_available === 0) return result(false, "occluded", sample?.quality?.confidence ?? null);
  const confidence = sample?.quality?.confidence ?? features.detection_confidence ?? null;
  if (confidence !== null && confidence < thresholds.minimumConfidence) return result(false, "low_confidence", confidence);
  return result(true, null, confidence);
}

export function evaluateWindow(samples, thresholds = QUALITY_THRESHOLDS_V1) {
  if (!Array.isArray(samples) || samples.length === 0) return windowResult(false, "no_data", 0, 0);
  const ordered = [...samples].sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at));
  if (ordered.length < thresholds.minimumFrames) return windowResult(false, "insufficient_data", 0, ordered.length);
  for (let index = 1; index < ordered.length; index += 1) {
    if (Date.parse(ordered[index].captured_at) - Date.parse(ordered[index - 1].captured_at) > thresholds.maximumGapMs) {
      return windowResult(false, "frame_loss", 0, ordered.length);
    }
  }
  const evaluated = ordered.map((sample) => evaluateFrame(sample, thresholds));
  const observable = evaluated.filter((item) => item.observable);
  const ratio = observable.length / evaluated.length;
  if (ratio < thresholds.minimumObservableRatio) {
    const reasons = evaluated.filter((item) => item.reason).map((item) => item.reason);
    const dominant = reasons.sort((a, b) => reasons.filter((item) => item === b).length - reasons.filter((item) => item === a).length)[0];
    return windowResult(false, dominant || "insufficient_continuity", ratio, evaluated.length);
  }
  const confidences = observable.map((item) => item.confidence).filter((value) => value !== null);
  return windowResult(true, null, ratio, evaluated.length, confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null);
}

function result(observable, reason, confidence) {
  return { observable, reason, confidence, message: reason ? QUALITY_MESSAGES[reason] : null };
}

function windowResult(allowInference, reason, observableRatio, sampleCount, confidence = null) {
  return { observable: allowInference, allow_inference: allowInference, allow_intervention: false, reason, observable_ratio: observableRatio, sample_count: sampleCount, confidence, message: reason ? QUALITY_MESSAGES[reason] : null };
}
