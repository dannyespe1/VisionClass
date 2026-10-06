"use client";

import { useEffect, useRef } from "react";
import { Camera, CheckCircle2, Eye, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "../../../ui/button";
import {
  OCULAR_MIN_VALID_SAMPLES,
  OCULAR_VALIDATION_PHASES,
  type OcularValidationPhase,
  type OcularValidationSummary,
} from "../../../lib/ocular-local-validation.mjs";

type OcularCalibrationScreenProps = {
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

const TARGET_POSITION: Record<OcularValidationPhase, string> = {
  frontal: "left-1/2",
  eyes_left: "left-[12vw]",
  eyes_right: "left-[88vw]",
  front_return: "left-1/2",
};

export function OcularCalibrationScreen({
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
}: OcularCalibrationScreenProps) {
  const calibration = summary?.calibration;
  const ready = calibration?.status === "ready";
  const phaseIndex = OCULAR_VALIDATION_PHASES.findIndex((item) => item.id === phase);
  const currentPhase = OCULAR_VALIDATION_PHASES[phaseIndex] || OCULAR_VALIDATION_PHASES[0];
  const currentCount = Math.min(calibration?.counts[phase] || 0, OCULAR_MIN_VALID_SAMPLES);
  const totalValid = Object.values(calibration?.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalRequired = OCULAR_VALIDATION_PHASES.length * OCULAR_MIN_VALID_SAMPLES;
  const progress = Math.min(100, Math.round((totalValid / totalRequired) * 100));
  const selectPhaseRef = useRef(onSelectPhase);
  const screenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    selectPhaseRef.current = onSelectPhase;
  }, [onSelectPhase]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    screenRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || ready || currentCount < OCULAR_MIN_VALID_SAMPLES || phaseIndex >= OCULAR_VALIDATION_PHASES.length - 1) return;
    const next = OCULAR_VALIDATION_PHASES[phaseIndex + 1];
    const timer = window.setTimeout(() => selectPhaseRef.current(next.id), 500);
    return () => window.clearTimeout(timer);
  }, [currentCount, open, phaseIndex, ready]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950 text-white" data-testid="ocular-calibration-screen">
      <section
        ref={screenRef}
        tabIndex={-1}
        aria-labelledby="ocular-calibration-title"
        aria-describedby="ocular-calibration-description"
        aria-modal="true"
        role="dialog"
        className="flex h-[100dvh] w-full flex-col overflow-hidden outline-none"
      >
        <header className="shrink-0 border-b border-white/10 bg-slate-950/95 px-4 py-3 sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-xl bg-violet-500/20 p-2.5 text-violet-200"><Eye className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Paso previo al curso</p>
                <h2 id="ocular-calibration-title" className="truncate text-lg font-semibold sm:text-xl">Calibración ocular local</h2>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-400">Progreso</p>
              <p className="text-lg font-semibold tabular-nums text-violet-200">{progress}%</p>
            </div>
          </div>
          <div className="mx-auto mt-3 h-1.5 max-w-7xl overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full rounded-full bg-violet-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <div
          className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.12),_transparent_45%)]"
          aria-label={`Objetivo visual: ${currentPhase.label}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-5 z-10 px-4 text-center sm:top-7">
            <p className="text-sm font-medium text-violet-200 sm:text-base">Paso {phaseIndex + 1} de {OCULAR_VALIDATION_PHASES.length}</p>
            <p id="ocular-calibration-description" className="mt-1 text-base text-slate-200 sm:text-lg">
              Mantén la cabeza quieta y mueve solamente los ojos hacia el punto.
            </p>
          </div>

          <div className="absolute inset-x-[8vw] top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />
          <div
            className={`absolute top-1/2 ${TARGET_POSITION[phase]} -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out motion-reduce:transition-none`}
          >
            <div className="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
              <span className="absolute inset-0 animate-pulse rounded-full border border-violet-300/25 bg-violet-400/5 motion-reduce:animate-none" />
              <span className="absolute h-16 w-16 rounded-full border border-violet-300/40 sm:h-20 sm:w-20" />
              <span className="absolute h-10 w-10 animate-ping rounded-full bg-violet-400/30 motion-reduce:animate-none" />
              <span className="relative block h-7 w-7 rounded-full border-4 border-white bg-violet-500 shadow-[0_0_28px_rgba(139,92,246,0.9)] sm:h-8 sm:w-8" />
            </div>
            <p className="absolute left-1/2 top-full mt-2 w-36 -translate-x-1/2 text-center text-sm font-semibold text-white">Mira aquí</p>
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center sm:bottom-6">
            <div className="rounded-full border border-white/10 bg-slate-900/85 px-4 py-2 text-center text-sm text-slate-300 backdrop-blur">
              {ready ? "Calibración completa" : `${currentPhase.label}: ${currentCount}/${OCULAR_MIN_VALID_SAMPLES} muestras válidas`}
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-slate-950 px-4 py-3 sm:px-8 sm:py-4">
          <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2" aria-label="Estado de los pasos de calibración">
                {OCULAR_VALIDATION_PHASES.map((item, index) => {
                  const count = Math.min(calibration?.counts[item.id] || 0, OCULAR_MIN_VALID_SAMPLES);
                  const completed = count >= OCULAR_MIN_VALID_SAMPLES;
                  const active = item.id === phase;
                  return (
                    <span
                      key={item.id}
                      aria-current={active ? "step" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                        active
                          ? "border-violet-400 bg-violet-400/15 text-violet-100"
                          : completed
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 text-slate-400"
                      }`}
                    >
                      {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
                      {item.label}
                    </span>
                  );
                })}
              </div>

              <div aria-live="polite" className="mt-2 text-sm">
                {cameraError && <p role="alert" className="text-amber-300">{cameraError}</p>}
                {submitError && <p role="alert" className="text-red-300">{submitError}</p>}
                {ready && <p className="font-medium text-emerald-300">Calibración lista. Ya puedes iniciar el curso.</p>}
                {calibration?.status === "insufficient" && (
                  <p className="font-medium text-amber-300">La señal no fue estable. Mantén el rostro centrado y repite la calibración.</p>
                )}
                {!cameraError && !submitError && !ready && calibration?.status !== "insufficient" && (
                  <p className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    Procesamiento local: no se guardan ni transmiten imágenes, video, landmarks o muestras individuales.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {calibration?.status === "insufficient" && (
                <Button type="button" variant="outline" onClick={onReset} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Repetir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onContinueWithoutCamera} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                {researchSessionRequired ? "Salir de la sesión" : "Continuar sin cámara"}
              </Button>
              <Button type="button" disabled={!ready || submitting} onClick={onComplete} className="bg-violet-600 text-white hover:bg-violet-500">
                <Camera className="mr-2 h-4 w-4" />
                {submitting ? "Validando…" : "Iniciar curso"}
              </Button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
