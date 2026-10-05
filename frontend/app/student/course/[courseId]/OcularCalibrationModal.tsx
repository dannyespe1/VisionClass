"use client";

import { useEffect, useRef } from "react";
import { Camera, CheckCircle2, Eye, ShieldCheck } from "lucide-react";
import { Button } from "../../../ui/button";
import {
  OCULAR_MIN_VALID_SAMPLES,
  OCULAR_VALIDATION_PHASES,
  type OcularValidationPhase,
  type OcularValidationSummary,
} from "../../../lib/ocular-local-validation.mjs";

type OcularCalibrationModalProps = {
  open: boolean;
  phase: OcularValidationPhase;
  summary: OcularValidationSummary | null;
  cameraError: string | null;
  submitError: string | null;
  submitting: boolean;
  researchSessionRequired: boolean;
  onSelectPhase: (phase: OcularValidationPhase) => void;
  onReset: () => void;
  onComplete: () => void;
  onContinueWithoutCamera: () => void;
};

export function OcularCalibrationModal({
  open,
  phase,
  summary,
  cameraError,
  submitError,
  submitting,
  researchSessionRequired,
  onSelectPhase,
  onReset,
  onComplete,
  onContinueWithoutCamera,
}: OcularCalibrationModalProps) {
  const calibration = summary?.calibration;
  const ready = calibration?.status === "ready";
  const phaseIndex = OCULAR_VALIDATION_PHASES.findIndex((item) => item.id === phase);
  const currentCount = Math.min(calibration?.counts[phase] || 0, OCULAR_MIN_VALID_SAMPLES);
  const totalValid = Object.values(calibration?.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalRequired = OCULAR_VALIDATION_PHASES.length * OCULAR_MIN_VALID_SAMPLES;
  const progress = Math.min(100, Math.round((totalValid / totalRequired) * 100));
  const selectPhaseRef = useRef(onSelectPhase);

  useEffect(() => {
    selectPhaseRef.current = onSelectPhase;
  }, [onSelectPhase]);

  useEffect(() => {
    if (!open || ready || currentCount < OCULAR_MIN_VALID_SAMPLES || phaseIndex >= OCULAR_VALIDATION_PHASES.length - 1) return;
    const next = OCULAR_VALIDATION_PHASES[phaseIndex + 1];
    const timer = window.setTimeout(() => selectPhaseRef.current(next.id), 500);
    return () => window.clearTimeout(timer);
  }, [currentCount, open, phaseIndex, ready]);

  const markerPosition = phase === "eyes_left" ? "left-8" : phase === "eyes_right" ? "right-8" : "left-1/2 -translate-x-1/2";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="ocular-calibration-title"
        aria-describedby="ocular-calibration-description"
        aria-modal="true"
        role="dialog"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        data-testid="ocular-calibration-modal"
      >
        <header className="border-b border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-violet-100 p-3 text-violet-700"><Eye className="h-6 w-6" /></span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Paso previo al curso</p>
              <h2 id="ocular-calibration-title" className="text-2xl font-semibold text-slate-950">Calibración ocular local</h2>
            </div>
          </div>
          <p id="ocular-calibration-description" className="mt-4 text-sm leading-6 text-slate-600">
            Mantén la cabeza estable y sigue únicamente con los ojos el punto violeta. Cada posición avanzará automáticamente.
          </p>
        </header>

        <div className="space-y-5 p-6 sm:p-8">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p>La calibración ocurre en este dispositivo. No se guardan ni transmiten imágenes, video, landmarks o muestras individuales.</p>
            </div>
          </div>

          {cameraError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{cameraError}</p>}
          {submitError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{submitError}</p>}

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <p className="font-medium text-slate-900">Paso {phaseIndex + 1} de {OCULAR_VALIDATION_PHASES.length}: {OCULAR_VALIDATION_PHASES[phaseIndex]?.label}</p>
              <p className="tabular-nums text-violet-700">{progress}%</p>
            </div>
            <div className="relative h-40 overflow-hidden rounded-xl border border-violet-100 bg-white" aria-label={`Objetivo visual: ${OCULAR_VALIDATION_PHASES[phaseIndex]?.label}`}>
              <div className="absolute left-1/2 top-1/2 h-px w-4/5 -translate-x-1/2 bg-violet-100" />
              <div className={`absolute top-1/2 ${markerPosition} -translate-y-1/2`}>
                <span className="absolute inset-0 animate-ping rounded-full bg-violet-300 motion-reduce:animate-none" />
                <span className="relative block h-8 w-8 rounded-full border-4 border-white bg-violet-600 shadow-lg" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100" aria-hidden="true">
              <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-center text-sm text-slate-600">No muevas la cabeza. Mantén la mirada en el punto hasta escuchar o ver la confirmación.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {OCULAR_VALIDATION_PHASES.map((item) => {
              const count = Math.min(summary?.calibration.counts[item.id] || 0, OCULAR_MIN_VALID_SAMPLES);
              const completed = count >= OCULAR_MIN_VALID_SAMPLES;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPhase(item.id)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    phase === item.id ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{item.label}</span>
                    {completed && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Completado" />}
                  </span>
                  <span className="mt-2 block text-sm text-slate-600">{count}/{OCULAR_MIN_VALID_SAMPLES} muestras válidas</span>
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {ready && <p className="font-medium text-emerald-700">Calibración lista. Ya puedes iniciar el curso.</p>}
            {calibration?.status === "collecting" && <p>Muestras válidas en esta posición: {currentCount}/{OCULAR_MIN_VALID_SAMPLES}.</p>}
            {calibration?.status === "insufficient" && (
              <div className="space-y-3">
                <p className="font-medium text-amber-800">La señal no fue suficientemente estable. Repite la calibración.</p>
                <Button type="button" variant="outline" size="sm" onClick={onReset}>Reiniciar calibración</Button>
              </div>
            )}
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end sm:p-8">
          <Button type="button" variant="outline" onClick={onContinueWithoutCamera}>
            {researchSessionRequired ? "Salir de la sesión" : "Continuar sin cámara"}
          </Button>
          <Button type="button" disabled={!ready || submitting} onClick={onComplete}>
            <Camera className="mr-2 h-4 w-4" />
            {submitting ? "Validando…" : "Iniciar curso"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
