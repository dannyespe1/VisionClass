"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { ObserverAnnotationForm } from "./ObserverAnnotationForm";

type Assignment = {
  assignment_id: string;
  target_code: string;
  starts_at: string;
  ends_at: string;
  manual_version: string;
  status: "scheduled" | "observing" | "ready" | "submitted" | "expired" | "consent_unavailable";
};

type Course = { id: number; title: string };
type ScheduleOption = { id: number; display_name: string };
type ParticipantOption = ScheduleOption & { active_session: boolean; consent_ready: boolean };
type ScheduleOptions = {
  participants: ParticipantOption[];
  reviewers: ScheduleOption[];
  window_seconds: number;
};

export function ObserverPanel({ allowScheduling = false }: { allowScheduling?: boolean }) {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [options, setOptions] = useState<ScheduleOptions | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const loadAssignments = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ assignments: Assignment[] }>("/api/observer-assignments/", {}, token);
      setAssignments(data.assignments);
    } catch {
      setError("No fue posible cargar las asignaciones de observación.");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadAssignments();
    const poll = window.setInterval(() => void loadAssignments(), 3000);
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(timer);
    };
  }, [token, loadAssignments]);

  useEffect(() => {
    if (!allowScheduling || !token) return;
    void apiFetch<Course[]>("/api/courses/", {}, token)
      .then((values) => setCourses(values))
      .catch(() => setError("No fue posible cargar los cursos autorizados."));
  }, [allowScheduling, token]);

  useEffect(() => {
    if (!allowScheduling || !token || !courseId) {
      setOptions(null);
      return;
    }
    setError("");
    void apiFetch<ScheduleOptions>(`/api/observer-schedules/?course_id=${encodeURIComponent(courseId)}`, {}, token)
      .then((value) => {
        setOptions(value);
        setParticipantId("");
        setReviewerId("");
      })
      .catch(() => setError("No fue posible preparar la lista de observación para este curso."));
  }, [allowScheduling, courseId, token]);

  const active = useMemo(
    () => assignments.find((item) => item.status === "ready")
      || assignments.find((item) => item.status === "observing")
      || assignments.find((item) => item.status === "scheduled"),
    [assignments],
  );
  const remainingMs = active ? new Date(active.starts_at).getTime() - clock : 0;

  const schedule = async () => {
    if (!token || !courseId || !participantId || !reviewerId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiFetch<Assignment>("/api/observer-schedules/", {
        method: "POST",
        body: JSON.stringify({
          course_id: Number(courseId),
          participant_id: Number(participantId),
          reviewer_id: Number(reviewerId),
          request_id: crypto.randomUUID(),
        }),
      }, token);
      setNotice("Ventana emparejada. Ambos observadores recibirán el mismo intervalo de 5 segundos.");
      await loadAssignments();
    } catch {
      setError("No se pudo programar la ventana. Verifica sesión, consentimiento y permiso del revisor.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (value: {
    assignmentId: string;
    category: "attentive" | "distracted" | "no_observable" | "uncertain";
    confidence: number;
    notesCode: string;
  }) => {
    if (!token) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiFetch<{ status: string; pair_status: string }>("/api/observer-assignments/", {
        method: "POST",
        body: JSON.stringify({
          assignment_id: value.assignmentId,
          category: value.category,
          confidence: value.confidence,
          notes_code: value.notesCode,
        }),
      }, token);
      setNotice(result.pair_status === "complete"
        ? "Anotación registrada. El par está completo; las respuestas continúan ocultas."
        : "Anotación registrada. La respuesta del otro observador continúa oculta.");
      await loadAssignments();
    } catch {
      setError("No se pudo registrar la anotación. La ventana puede no haber iniciado, haber expirado o carecer de consentimiento vigente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="observer-panel-title">
      <div>
        <h2 id="observer-panel-title" className="text-xl font-semibold text-slate-900">Observación ciega sincronizada</h2>
        <p className="text-sm text-slate-600">Solo conducta visible. No se muestran imágenes, predicciones, resultados académicos ni la respuesta del otro observador.</p>
      </div>

      {allowScheduling && <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 md:grid-cols-4">
        <label className="text-sm">Curso
          <select className="mt-1 w-full rounded border p-2" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            <option value="">Selecciona</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="text-sm">Estudiante
          <select className="mt-1 w-full rounded border p-2" value={participantId} onChange={(event) => setParticipantId(event.target.value)} disabled={!options}>
            <option value="">Selecciona</option>
            {options?.participants.map((item) => <option key={item.id} value={item.id} disabled={!item.active_session || !item.consent_ready}>
              {item.display_name}{!item.active_session ? " · sin sesión" : !item.consent_ready ? " · sin consentimiento" : ""}
            </option>)}
          </select>
        </label>
        <label className="text-sm">Segundo observador
          <select className="mt-1 w-full rounded border p-2" value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} disabled={!options}>
            <option value="">Selecciona</option>
            {options?.reviewers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
          </select>
        </label>
        <button type="button" className="self-end rounded bg-slate-900 p-2 text-white disabled:opacity-50" disabled={busy || !participantId || !reviewerId} onClick={() => void schedule()}>
          Programar 5 segundos
        </button>
      </div>}

      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {!active && <p className="rounded border border-dashed p-4 text-sm text-slate-600">No hay una ventana pendiente. Las anotaciones enviadas no pueden editarse.</p>}
      {active?.status === "scheduled" && <div className="rounded border border-cyan-200 bg-cyan-50 p-4">
        <p className="font-semibold">Objetivo: {active.target_code}</p>
        <p className="text-sm">La ventana inicia en {Math.max(0, Math.ceil(remainingMs / 1000))} segundos. Observe únicamente cuando el contador llegue a cero.</p>
      </div>}
      {active?.status === "observing" && <div className="rounded border border-cyan-300 bg-cyan-50 p-4" role="timer" aria-live="polite">
        <p className="font-semibold">Observe ahora: {active.target_code}</p>
        <p className="text-2xl font-bold tabular-nums">{Math.max(0, Math.ceil((new Date(active.ends_at).getTime() - clock) / 1000))}</p>
        <p className="text-sm">Los controles se habilitarán cuando finalice la ventana.</p>
      </div>}
      {active?.status === "ready" && <div className="space-y-3 rounded border border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold">Objetivo: {active.target_code}</p>
        <p className="text-sm">Ventana asignada: {new Date(active.starts_at).toLocaleTimeString()}–{new Date(active.ends_at).toLocaleTimeString()}.</p>
        <ObserverAnnotationForm assignmentId={active.assignment_id} onSubmit={(value) => void submit(value)} />
      </div>}

      <details>
        <summary className="cursor-pointer text-sm font-medium">Estado de asignaciones recientes</summary>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {assignments.map((item) => <li key={item.assignment_id}>{item.target_code} · {item.status} · {item.manual_version}</li>)}
        </ul>
      </details>
    </section>
  );
}
