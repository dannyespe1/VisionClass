"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import D2RWidget from "./test-widget";

type PhaseResult = { TR: number; TA: number; O: number; C: number; CON: number; targetCount: number };
type PhaseEvent = { phase: number; ts: number; cellId: number; isTarget: boolean };

export default function D2RPage() {
  const totalPhases = 14;
  const durationSeconds = 15;

  const router = useRouter();
  const { token } = useAuth();

  const [phase, setPhase] = useState(1);
  const [phaseResults, setPhaseResults] = useState<(PhaseResult | null)[]>(() =>
    Array(totalPhases).fill(null)
  );

  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");

  const [rawScore, setRawScore] = useState("0");
  const [processing, setProcessing] = useState("0");
  const [attention, setAttention] = useState("0");
  const [errors, setErrors] = useState("0");

  const [status, setStatus] = useState("");
  const [cameraStatus, setCameraStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(phase);
  const timeLeftRef = useRef<number>(durationSeconds);
  const spinningRef = useRef<boolean>(false);
  const phaseTimingRef = useRef<Record<number, { start: number; end: number; summary: PhaseResult }>>({});
  const phaseEventsRef = useRef<PhaseEvent[]>([]);

  const completedPhases = useMemo(() => phaseResults.filter((r) => r !== null).length, [phaseResults]);
  const progress = Math.round((completedPhases / totalPhases) * 100);

  // Bootstrap: usuario, curso base, sesin y cmara
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    const bootstrap = async () => {
      try {
        const me = await apiFetch<{ id: number }>("/api/me/", {}, token);
        setUserId(String(me.id));

        await apiFetch<any[]>("/api/d2r-results/", {}, token);

        const session = await apiFetch<{ id: number }>(
          "/api/d2r-sessions/",
          { method: "POST", body: JSON.stringify({}) },
          token
        );
        if (session.id) {
          setSessionId(String(session.id));
          setStatus("Sesión creada automaticamente");
        } else {
          setStatus("No se pudo crear sesión para el test D2R.");
        }

        await requestCamera();
      } catch (err: any) {
        setStatus(err.message || "Error iniciando sesin D2R");
      }
    };
    bootstrap();
  }, [token, router]);

  const handlePhaseFinish = (phaseNumber: number, result: PhaseResult) => {
    if (finished) return;
    setPhaseResults((prev) => {
      if (phaseNumber < 1 || phaseNumber > totalPhases) return prev;
      if (prev[phaseNumber - 1]) return prev;

      const copy = [...prev];
      copy[phaseNumber - 1] = result;

      const allDone = copy.every((r) => r !== null);
      if (allDone) {
        const totals = copy.reduce(
          (acc, r) => {
            if (!r) return acc;
            acc.TR += r.TR;
            acc.TA += r.TA;
            acc.O += r.O;
            acc.C += r.C;
            acc.CON += r.CON;
            return acc;
          },
          { TR: 0, TA: 0, O: 0, C: 0, CON: 0 }
        );

        const totalTime = totalPhases * durationSeconds;
        // Mantener compatibilidad de campos actuales:
        // raw_score = TA (aciertos)
        // errors = C (comisiones)
        // attention_span = CON (TA - C)
        setRawScore(String(totals.TA));
        setErrors(String(totals.C));
        setAttention(String(Math.max(totals.CON, 0)));
        setProcessing((totals.TA / totalTime).toFixed(2));
        setStatus("Test completado. Guardaremos este resultado como lnea base.");
        stopCamera();
        setFinished(true);
      }
      return copy;
    });

    if (phaseNumber < totalPhases) {
      setPhase(Math.min(phaseNumber + 1, totalPhases));
    }
  };

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const submit = async () => {
    if (!sessionId || !userId) {
      setStatus("No hay session_id o user_id autoasignados.");
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
            d2r_session_id: Number(sessionId),
            user_id: Number(userId),
            raw_score: Number(rawScore),
            processing_speed: Number(processing),
            attention_span: Number(attention),
            errors: Number(errors),
            phase_data: {
              totalPhases,
              durationSeconds,
              phases: Object.entries(phaseTimingRef.current).map(([k, v]) => ({
                phase: Number(k),
                start: v.start,
                end: v.end,
                summary: v.summary,
              })),
            },
          }),
        },
        token
      );
      setStatus("Resultado guardado en VisionClass");
      router.push("/student");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setStatus(msg);
    }
  };

  const requestCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = media;
      setCameraStatus("granted");
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraStatus("denied");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Enviar frames al servicio ML mientras el test est en curso
  useEffect(() => {
    if (!started || finished || cameraStatus !== "granted" || !sessionId || !userId) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const sendFrame = async () => {
      if (cancelled) return;
      if (!video.videoWidth || !video.videoHeight) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        async (blob) => {
          if (!blob || cancelled) return;
          const form = new FormData();
          form.append("file", blob, "frame.jpg");
          form.append("d2r_session_id", sessionId);
          form.append("user_id", userId);
          form.append("test_name", "D2R");
          form.append("phase", String(phaseRef.current));
          form.append("time_left", String(timeLeftRef.current ?? 0));
          // d2-R no incluye estímulos dinámicos; mantener el campo por compatibilidad backend.
          form.append("spinning", "false");
          const start = phaseTimingRef.current[phaseRef.current].start;
          if (start) form.append("t_in_phase_ms", String(Math.max(Date.now() - start, 0)));
          if (phaseEventsRef.current.length) {
            form.append("events", JSON.stringify(phaseEventsRef.current.slice(-50)));
          }
          try {
            await fetch("/api/attention-proxy", {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: form,
            });
          } catch (_) {
            // Silenciar errores de red para no romper el test
          }
        },
        "image/jpeg",
        0.6
      );
    };

    const interval = setInterval(sendFrame, 500);
    sendFrame();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [started, finished, cameraStatus, sessionId, userId, token]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center">
      {!started && (
        <section className="max-w-4xl w-full px-4 py-10 flex flex-col items-center">
          <div className="w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-6">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Evaluación de línea base</p>
              <p>Este test inicial establecer tu perfil atencional para personalizar tu aprendizaje.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-sky-100 flex items-center justify-center text-xl">D2R</div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Test de Atención D2R</h1>
                <p className="text-sm text-slate-600">Calibramos tu perfil atencional antes de entrar al panel.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-500">Duración</p>
                <p className="font-semibold text-slate-900">5-7 minutos</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-500">Objetivo</p>
                <p className="font-semibold text-slate-900">Medir atención</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-500">Fases</p>
                <p className="font-semibold text-slate-900">14 secciones</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-2">
              <p className="font-semibold text-slate-900">Instrucciones:</p>
              <ol className="list-decimal list-inside text-slate-700 space-y-1">
                <li>Se presentan filas de letras "d" y "p" con diferentes números de guiones.</li>
                <li>Marca unicamente las "d" con exactamente dos guiones (uno arriba y uno abajo).</li>
                <li>Tienes 15 segundos por fila. Trabaja rápido y preciso.</li>
                <li>La cámara se usar para monitorear atención (no guardamos video).</li>
              </ol>
            </div>

            <div className="rounded-xl bg-blue-600 text-white p-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">D2R</span>
                <p className="font-semibold">Monitoreo de Atención</p>
              </div>
              <p className="text-blue-50 text-sm">
                Durante el test, usaremos tu cámara para calcular métricas de atención de forma pasiva y no invasiva.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={requestCamera}
                className="px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow hover:bg-black"
              >
                {cameraStatus === "pending"
                   "Permitir cámara"
                  : cameraStatus === "granted"
                   "Cámara habilitada"
                  : "Reintentar cámara"}
              </button>
              <button
                disabled={cameraStatus !== "granted"}
                onClick={() => setStarted(true)}
                className="px-5 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold disabled:opacity-60"
              >
                Comenzar Test
              </button>
            </div>
            {cameraStatus === "denied" && (
              <p className="text-sm text-red-600">No pudimos acceder a la cámara. Revisa permisos en el navegador.</p>
            )}
            <p className="text-xs text-slate-500">{status}</p>
          </div>
        </section>
      ) : finished ? (
        <section className="w-full flex justify-center py-12 px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-xl w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
              
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Test D2R Completado!</h2>
            <p className="text-sm text-slate-600">
              Has completado el test de atención. Usaremos estos datos como línea base para tus cursos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={submit}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow hover:bg-black"
              >
                Guardar resultado
              </button>
              <button
                onClick={() => router.push("/student")}
                className="px-5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold"
              >
                Ir al panel
              </button>
            </div>
            <p className="text-xs text-slate-500">{status}</p>
          </div>
        </section>
      ) : (
        <section className="w-full">
          <div className="w-full border-b border-slate-100 bg-white">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center">
                  <span className="text-sky-600 font-semibold">D2R</span>
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
              <div className="text-xs text-slate-500">
                Fase {Math.min(phase, totalPhases)} de {totalPhases}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 pt-8 pb-12 flex flex-col items-center gap-10">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-100 p-4">
              <D2RWidget
                durationSeconds={durationSeconds}
                phase={phase}
                totalPhases={totalPhases}
                onFinish={handlePhaseFinish}
                onTick={({ phase: ph, timeLeft }) => {
                  phaseRef.current = ph;
                  timeLeftRef.current = timeLeft;
                  spinningRef.current = false;
                }}
                onPhaseStart={({ phase: ph, startedAt }) => {
                  phaseRef.current = ph;
                  timeLeftRef.current = durationSeconds;
                  spinningRef.current = false;
                  phaseTimingRef.current[ph] = { ...(phaseTimingRef.current[ph] || {}), start: startedAt };
                  phaseEventsRef.current = [];
                }}
                onPhaseEnd={({ phase: ph, endedAt, TR, TA, O, C, CON, targetCount }) => {
                  phaseTimingRef.current[ph] = {
                    ...(phaseTimingRef.current[ph] || {}),
                    end: endedAt,
                    summary: { TR, TA, O, C, CON, targetCount },
                  };
                }}
                onClickEvent={({ phase: ph, ts, cellId, isTarget }) => {
                  phaseEventsRef.current.push({ phase: ph, ts, cellId, isTarget });
                  if (phaseEventsRef.current.length > 200) {
                    phaseEventsRef.current.shift();
                  }
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* video oculto para mantener la cmara activa */}
      <video ref={videoRef} style={{ display: "none" }} />
    </main>
  );
}
