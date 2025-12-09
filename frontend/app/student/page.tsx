"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, postFrameToML } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { InicioSection } from "./InicioSection";
import { CursosSection } from "./CursosSection";
import { EstadisticasSection } from "./EstadisticasSection";
import { StudentNavbar } from "./StudentNavbar";

type ContentViewPayload = {
  session_id: number;
  content_type: string;
  content_id: string;
};

export default function StudentPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [activeTab, setActiveTab] = useState<"inicio" | "cursos" | "estadisticas">("inicio");
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [score, setScore] = useState<number | null>(null);
  const [frameScore, setFrameScore] = useState<number | null>(null);
  const [contentId, setContentId] = useState("");
  const [contentType, setContentType] = useState("pdf");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [testMode, setTestMode] = useState(true); // permite usar la camara sin curso

  const { token } = useAuth();

  const stopStream = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
    }
    setStatus("Camara detenida");
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    const loadMe = async () => {
      try {
        const me = await apiFetch<{ id: number }>("/api/me/", {}, token);
        if (me?.id) setUserId(String(me.id));
      } catch (err) {
        console.warn("No se pudo obtener /api/me", err);
      }
    };
    loadMe();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
    };
  }, [token, router]);

  const startStream = async () => {
    if (!userId) {
      setStatus("Ingresa user_id (inicia sesion)");
      return;
    }
    if (!selectedCourse && !testMode) {
      setStatus("Selecciona un curso o activa modo prueba para usar la camara");
      return;
    }
    if (!sessionId) setSessionId("1");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setRunning(true);
      setStatus("Camara activa. Acepta el permiso en el navegador.");
      timerRef.current = setInterval(sendFrame, 2000);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "No se pudo iniciar la camara";
      setStatus(msg);
    }
  };

  const sendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!sessionId || !userId) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );
      if (!blob) return;

      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      form.append("session_id", sessionId || "1");
      form.append("user_id", userId);

      const resp = await postFrameToML(form);
      setScore(resp?.score?.value ?? null);
      setFrameScore(resp?.frame_score?.value ?? null);
      setStatus("Frame enviado");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error enviando frame";
      setStatus(msg);
    }
  };

  const sendContentView = async () => {
    if (!sessionId || !userId || !contentId) {
      setStatus("Completa session_id, user_id y contenido");
      return;
    }
    try {
      const payload: ContentViewPayload = {
        session_id: Number(sessionId),
        content_type: contentType,
        content_id: contentId,
      };
      await apiFetch(
        "/api/content-views/",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token
      );
      setStatus("Contenido registrado");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error registrando contenido";
      setStatus(msg);
    }
  };

  const goToD2R = () => {
    router.push("/d2r");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <StudentNavbar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-6 space-y-6">
        {/* Header solo en la pestaña de inicio */}
        {activeTab === "inicio" ? (
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Bienvenido de nuevo</h1>
                <p className="text-sm text-slate-500">Continua con tu aprendizaje donde lo dejaste.</p>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                />
                <span>Modo prueba (usar camara sin curso)</span>
              </label>
            </div>
          </header>
        ) : (
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
              />
              <span>Modo prueba (usar camara sin curso)</span>
            </label>
          </div>
        )}

        {/* Inicio */}
        {activeTab === "inicio" && (
          <>
            <section className="w-full rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-6 py-6 sm:px-8 sm:py-7 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <span className="text-xl">👁️</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">Muestreo mensual de atencion</p>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-white/20">5-7 minutos</span>
                  </div>
                </div>
                <p className="text-sm text-sky-50 max-w-xl">
                  Actualiza tu perfil atencional. Este breve test ayuda a personalizar tu experiencia.
                </p>
                <p className="text-[11px] text-sky-100/80">Ultimo test hace 28 dias · Proxima sugerencia en 2 dias</p>
              </div>

              <div className="flex flex-col md:items-end gap-2">
                <button
                  type="button"
                  onClick={goToD2R}
                  className="inline-flex items-center justify-center rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-semibold shadow hover:bg-slate-100"
                >
                  Realizar Test D2R
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-white/40 text-white px-4 py-2 text-xs font-medium hover:bg-white/10"
                >
                  Recordar mas tarde
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <p className="text-xs text-slate-500">Cursos activos</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">3</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">▶</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <p className="text-xs text-slate-500">Lecciones completadas</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">45</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">✓</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <p className="text-xs text-slate-500">Tiempo de estudio</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">12.5h</p>
                  <p className="text-[11px] text-slate-400">Esta semana</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">⏱</div>
              </div>
            </section>

            <section className="space-y-3 mt-4">
              <h2 className="text-lg font-semibold text-slate-900">Mis Cursos</h2>
              <InicioSection
                onCourseSelect={(title) => {
                  setContentId(title);
                  setSelectedCourse(title);
                  if (!sessionId) setSessionId("1");
                }}
              />
            </section>
          </>
        )}

        {/* Cursos */}
        {activeTab === "cursos" && (
          <section className="space-y-4">
            <CursosSection
              onCourseSelect={(title) => {
                setContentId(title);
                setSelectedCourse(title);
                if (!sessionId) setSessionId("1");
              }}
            />
          </section>
        )}

        {/* Estadisticas */}
        {activeTab === "estadisticas" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 transition transform hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs text-slate-500">Atencion promedio</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {score !== null ? `${(score * 100).toFixed(0)}%` : "--"}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 transition transform hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs text-slate-500">Ultimo frame</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {frameScore !== null ? frameScore.toFixed(2) : "--"}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 transition transform hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs text-slate-500">Sesion</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{sessionId || "--"}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 transition transform hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs text-slate-500">Curso seleccionado</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedCourse || (testMode ? "Modo prueba" : "--")}
                </p>
              </div>
            </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-4 transition transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Seguimiento en vivo</h3>
                    <p className="text-xs text-slate-500">Activa la camara y envia frames al servicio ML.</p>
                  </div>
                  <button
                    type="button"
                    onClick={running ? stopStream : startStream}
                    className={`text-xs font-semibold rounded-xl px-3 py-1.5 ${
                      running
                        ? "bg-slate-100 text-slate-700"
                        : "bg-sky-600 text-white shadow-sm hover:bg-sky-700"
                    }`}
                  >
                    {running ? "Detener" : "Iniciar camara"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700 text-xs">Session ID</label>
                    <input
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      placeholder="Ej: 1"
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700 text-xs">User ID</label>
                    <input
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Ej: 2"
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={sendFrame}
                    disabled={!running}
                    className="text-xs rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Enviar frame ahora
                  </button>
                  {!token && (
                    <p className="text-[11px] text-slate-400">Inicia sesion en /login para registrar en backend.</p>
                  )}
                </div>

                <p className="text-xs text-slate-500">Estado: {status || "Listo"}</p>

                <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">Score secuencial</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {score !== null ? score.toFixed(3) : "--"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">Score frame</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {frameScore !== null ? frameScore.toFixed(3) : "--"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-4 transition transform hover:-translate-y-1">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Registrar vista de contenido</h3>
                  <p className="text-xs text-slate-500">Asocia tu sesion con un recurso (PDF, video, quiz).</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700 text-xs">Tipo</label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700 text-xs">Contenido ID</label>
                    <input
                      value={contentId}
                      onChange={(e) => setContentId(e.target.value)}
                      placeholder="slug o id de contenido"
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={sendContentView}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-black"
                >
                  Guardar vista
                </button>
              </div>
            </div>

            <EstadisticasSection />
          </section>
        )}
      </div>

      {/* elementos ocultos para la camara */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </main>
  );
}
