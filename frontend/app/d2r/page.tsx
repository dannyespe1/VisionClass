"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import D2RWidget from "./test-widget";

type PhaseResult = { hits: number; errors: number; omissions: number };

export default function D2RPage() {
  const totalPhases = 14;
  const durationSeconds = 20;

  const [phase, setPhase] = useState(1);
  const [phaseResults, setPhaseResults] = useState<(PhaseResult | null)[]>(
    () => Array(totalPhases).fill(null)
  );

  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");
  const [rawScore, setRawScore] = useState("0");
  const [processing, setProcessing] = useState("0");
  const [attention, setAttention] = useState("0");
  const [errors, setErrors] = useState("0");
  const [status, setStatus] = useState("");
  const { token } = useAuth();

  const completedPhases = useMemo(
    () => phaseResults.filter((r) => r !== null).length,
    [phaseResults]
  );
  const progress = Math.round((completedPhases / totalPhases) * 100);

  const handlePhaseFinish = (result: PhaseResult) => {
    setPhaseResults((prev) => {
      const copy = [...prev];
      copy[phase - 1] = result;

      const allDone = copy.every((r) => r !== null);
      if (allDone) {
        const totals = copy.reduce(
          (acc, r) => {
            if (!r) return acc;
            acc.hits += r.hits;
            acc.errors += r.errors;
            acc.omissions += r.omissions;
            return acc;
          },
          { hits: 0, errors: 0, omissions: 0 }
        );

        const totalTime = totalPhases * durationSeconds;

        setRawScore(String(totals.hits));
        setErrors(String(totals.errors));
        setAttention(
          String(Math.max(totals.hits - totals.errors - totals.omissions, 0))
        );
        setProcessing((totals.hits / totalTime).toFixed(2));
        setStatus("Test completado. Puedes guardar el resultado.");
      }
      return copy;
    });

    if (phase < totalPhases) {
      setPhase((p) => p + 1);
    }
  };

  const submit = async () => {
    if (!sessionId || !userId) {
      setStatus("Completa session_id y user_id");
      return;
    }
    if (!token) {
      setStatus("Inicia sesión primero en /login");
      return;
    }
    try {
      await apiFetch(
        "/api/d2r-results/",
        {
          method: "POST",
          body: JSON.stringify({
            session_id: Number(sessionId),
            user_id: Number(userId),
            raw_score: Number(rawScore),
            processing_speed: Number(processing),
            attention_span: Number(attention),
            errors: Number(errors),
          }),
        },
        token
      );
      setStatus("Resultado guardado en VisionClass");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setStatus(msg);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center">
      {/* Barra superior tipo InsightfulTraits */}
      <div className="w-full border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center">
              <span className="text-sky-600 font-semibold">👁️</span>
            </div>
            <span className="text-sm font-semibold text-slate-800">Test D2R</span>
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-500">{progress}% completado</span>
            </div>
            <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-400 transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido central: fase actual del test */}
      <section className="flex-1 w-full flex">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 flex flex-col items-center gap-10">
          {/* “Pregunta” centrada: en este caso, la matriz D2R */}
          <div className="w-full max-w-4xl">
            <D2RWidget
              durationSeconds={durationSeconds}
              rowSize={12}
              targetProbability={0.4}
              phase={phase}
              totalPhases={totalPhases}
              onFinish={handlePhaseFinish}
            />
          </div>

          {/* Resumen + formulario para guardar */}
          <div className="w-full max-w-3xl bg-slate-50 border border-slate-200 rounded-3xl px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Resumen del test
                </h2>
                <p className="text-xs text-slate-500">
                  Una vez completas todas las fases, puedes guardar el resultado en
                  VisionClass.
                </p>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="text-center">
                  <p className="text-slate-500">Puntuación total</p>
                  <p className="text-base font-semibold text-slate-900">{rawScore}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Errores</p>
                  <p className="text-base font-semibold text-slate-900">{errors}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Velocidad (hits/seg)</p>
                  <p className="text-base font-semibold text-slate-900">
                    {processing}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-700">Session ID</label>
                <input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-700">User ID</label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-700">Attention span</label>
                <input
                  value={attention}
                  onChange={(e) => setAttention(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={submit}
                className="inline-flex w-fit items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Guardar resultado
              </button>
              <p className="text-xs text-slate-500">{status}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
