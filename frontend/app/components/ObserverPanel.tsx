"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import {
  MAX_SEAT_COLUMNS,
  MAX_SEAT_ROWS,
  addObservedSeatCode,
  buildSeatGrid,
  isValidSeatLayout,
  sanitizeObservedSeatCodes,
} from "../lib/seat-grid.mjs";
import { ObserverAnnotationForm } from "./ObserverAnnotationForm";

type Assignment = {
  assignment_id: string;
  target_code: string;
  starts_at: string;
  ends_at: string;
  manual_version: string;
  location_code: string;
  status: "scheduled" | "observing" | "ready" | "submitted" | "expired" | "consent_unavailable";
};

const observerStatusLabels: Record<Assignment["status"], string> = {
  scheduled: "Programada",
  observing: "En observación",
  ready: "Lista para anotar",
  submitted: "Enviada",
  expired: "Expirada",
  consent_unavailable: "Consentimiento no disponible",
};

type Course = { id: number; title: string };
type ScheduleOption = { id: number; display_name: string };
type ParticipantOption = ScheduleOption & { active_session: boolean; consent_ready: boolean };
type ScheduleOptions = {
  participants: ParticipantOption[];
  observers: ScheduleOption[];
  window_seconds: number;
};

type SeatLayout = { rows: number; columns: number };

const layoutStorageKey = (courseId: string) => `atendynex.observer-seat-layout.${courseId}`;
const progressStorageKey = (courseId: string) => `atendynex.observer-seat-progress.${courseId}`;

export function ObserverPanel({ allowScheduling = false }: { allowScheduling?: boolean }) {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [options, setOptions] = useState<ScheduleOptions | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [observerId, setObserverId] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [rowCount, setRowCount] = useState("");
  const [columnCount, setColumnCount] = useState("");
  const [seatLayout, setSeatLayout] = useState<SeatLayout | null>(null);
  const [observedSeatCodes, setObservedSeatCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const serverOffsetMsRef = useRef(0);

  const loadAssignments = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ server_now: string; assignments: Assignment[] }>("/api/observer-assignments/", {}, token);
      serverOffsetMsRef.current = new Date(data.server_now).getTime() - Date.now();
      setAssignments(data.assignments);
    } catch {
      setError("No fue posible cargar las asignaciones de observación.");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadAssignments();
    const poll = window.setInterval(() => void loadAssignments(), 3000);
    const timer = window.setInterval(() => setClock(Date.now() + serverOffsetMsRef.current), 250);
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
        setObserverId("");
        setLocationCode("");
      })
      .catch(() => setError("No fue posible preparar la lista de observación para este curso."));
  }, [allowScheduling, courseId, token]);

  useEffect(() => {
    if (!allowScheduling || !courseId) {
      setRowCount("");
      setColumnCount("");
      setSeatLayout(null);
      return;
    }

    try {
      const saved = window.localStorage.getItem(layoutStorageKey(courseId));
      if (!saved) {
        setRowCount("");
        setColumnCount("");
        setSeatLayout(null);
        return;
      }
      const parsed = JSON.parse(saved) as Partial<SeatLayout>;
      const rows = Number(parsed.rows);
      const columns = Number(parsed.columns);
      if (!isValidSeatLayout(rows, columns)) {
        window.localStorage.removeItem(layoutStorageKey(courseId));
        setRowCount("");
        setColumnCount("");
        setSeatLayout(null);
        return;
      }
      setRowCount(String(rows));
      setColumnCount(String(columns));
      setSeatLayout({ rows, columns });
    } catch {
      setRowCount("");
      setColumnCount("");
      setSeatLayout(null);
    }
  }, [allowScheduling, courseId]);

  useEffect(() => {
    if (!allowScheduling || !courseId) {
      setObservedSeatCodes([]);
      return;
    }
    try {
      const saved = window.localStorage.getItem(progressStorageKey(courseId));
      setObservedSeatCodes(sanitizeObservedSeatCodes(saved ? JSON.parse(saved) : []));
    } catch {
      setObservedSeatCodes([]);
    }
  }, [allowScheduling, courseId]);

  const active = useMemo(
    () => assignments.find((item) => item.status === "ready")
      || assignments.find((item) => item.status === "observing")
      || assignments.find((item) => item.status === "scheduled"),
    [assignments],
  );
  const remainingMs = active ? new Date(active.starts_at).getTime() - clock : 0;
  const seats = useMemo(
    () => seatLayout ? buildSeatGrid(seatLayout.rows, seatLayout.columns) : [],
    [seatLayout],
  );
  const observedSeats = useMemo(() => new Set(observedSeatCodes), [observedSeatCodes]);
  const visibleObservedCount = useMemo(
    () => seats.filter((seat) => observedSeats.has(seat.code)).length,
    [observedSeats, seats],
  );

  const persistObservedSeats = (codes: string[]) => {
    const sanitized = sanitizeObservedSeatCodes(codes);
    setObservedSeatCodes(sanitized);
    try {
      window.localStorage.setItem(progressStorageKey(courseId), JSON.stringify(sanitized));
    } catch {
      // El progreso visual continúa disponible durante esta sesión del navegador.
    }
  };

  const createSeatLayout = () => {
    const rows = Number(rowCount);
    const columns = Number(columnCount);
    if (!isValidSeatLayout(rows, columns)) {
      setError(`Ingresa entre 1 y ${MAX_SEAT_ROWS} filas y entre 1 y ${MAX_SEAT_COLUMNS} columnas.`);
      return;
    }
    const nextLayout = { rows, columns };
    setError("");
    setNotice("");
    setSeatLayout(nextLayout);
    setLocationCode("");
    const validCodes = new Set(buildSeatGrid(rows, columns).map((seat) => seat.code));
    persistObservedSeats(observedSeatCodes.filter((code) => validCodes.has(code)));
    try {
      window.localStorage.setItem(layoutStorageKey(courseId), JSON.stringify(nextLayout));
    } catch {
      // La cuadrícula sigue disponible durante esta sesión aunque el navegador bloquee almacenamiento local.
    }
  };

  const resetObservationRound = () => {
    setLocationCode("");
    persistObservedSeats([]);
    setError("");
    setNotice("Nueva ronda iniciada. Las anotaciones guardadas no se modificaron; solo se reinició el progreso visual de los puestos.");
  };

  const schedule = async () => {
    if (!token || !courseId || !participantId || !observerId || !/^[A-Z0-9-]{2,16}$/.test(locationCode)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiFetch<Assignment>("/api/observer-schedules/", {
        method: "POST",
        body: JSON.stringify({
          course_id: Number(courseId),
          participant_id: Number(participantId),
          observer_id: Number(observerId),
          location_code: locationCode,
          request_id: crypto.randomUUID(),
        }),
      }, token);
      setNotice("Ventana emparejada. Profesor y observador recibirán el mismo puesto e intervalo de 5 segundos.");
      await loadAssignments();
    } catch {
      setError("No se pudo programar la ventana. Verifica sesión, consentimiento y rol del observador.");
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
      if (allowScheduling && active?.location_code) {
        persistObservedSeats(addObservedSeatCode(observedSeatCodes, active.location_code));
        setLocationCode("");
      }
      await loadAssignments();
    } catch {
      setError("No se pudo registrar la anotación. La ventana puede no haber iniciado, haber expirado o carecer de consentimiento vigente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5" aria-labelledby="observer-panel-title">
      <div>
        <h2 id="observer-panel-title" className="text-xl font-semibold text-foreground">Observación ciega sincronizada</h2>
        <p className="text-sm text-muted-foreground">Solo conducta visible. No se muestran imágenes, predicciones, resultados académicos ni la respuesta del otro observador.</p>
      </div>

      {allowScheduling && <div className="space-y-4 rounded-lg border border-border bg-muted p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">Curso
            <select className="mt-1 w-full rounded border border-border bg-background p-2" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">Selecciona</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label className="text-sm">Estudiante
            <select className="mt-1 w-full rounded border border-border bg-background p-2" value={participantId} onChange={(event) => setParticipantId(event.target.value)} disabled={!options}>
              <option value="">Selecciona</option>
              {options?.participants.map((item) => <option key={item.id} value={item.id} disabled={!item.active_session || !item.consent_ready}>
                {item.display_name}{!item.active_session ? " · sin sesión" : !item.consent_ready ? " · sin consentimiento" : ""}
              </option>)}
            </select>
          </label>
          <label className="text-sm">Observador independiente
            <select className="mt-1 w-full rounded border border-border bg-background p-2" value={observerId} onChange={(event) => setObserverId(event.target.value)} disabled={!options}>
              <option value="">Selecciona</option>
              {options?.observers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="space-y-3" disabled={!courseId}>
          <legend className="text-sm font-semibold text-foreground">Distribución del aula</legend>
          <p className="text-xs text-muted-foreground">Configura la cuadrícula y selecciona el puesto físico del estudiante. La fila A es la más cercana al frente.</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="text-sm">Filas
              <input
                className="mt-1 w-full rounded border border-border bg-background p-2"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_SEAT_ROWS}
                value={rowCount}
                onChange={(event) => setRowCount(event.target.value)}
              />
            </label>
            <label className="text-sm">Columnas
              <input
                className="mt-1 w-full rounded border border-border bg-background p-2"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_SEAT_COLUMNS}
                value={columnCount}
                onChange={(event) => setColumnCount(event.target.value)}
              />
            </label>
            <button type="button" className="self-end rounded border border-primary px-4 py-2 text-primary hover:bg-primary/10 disabled:opacity-50" onClick={createSeatLayout} disabled={!rowCount || !columnCount}>
              Crear cuadrícula
            </button>
          </div>
        </fieldset>

        {seatLayout && <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="mx-auto max-w-xl rounded-full border-2 border-primary/40 bg-primary/5 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Frente / pizarra
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-3" aria-label="Leyenda de puestos">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-border bg-card" aria-hidden="true" /> Pendiente</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" aria-hidden="true" /> Seleccionado</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-success/40 bg-success/15" aria-hidden="true" /> Anotación docente registrada</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{visibleObservedCount} de {seats.length} puestos observados</span>
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:opacity-50"
                disabled={visibleObservedCount === 0}
                onClick={resetObservationRound}
              >
                Iniciar nueva ronda
              </button>
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <div
              className="mx-auto grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${seatLayout.columns}, minmax(2.75rem, 1fr))`,
                minWidth: `${seatLayout.columns * 52}px`,
                maxWidth: `${seatLayout.columns * 72}px`,
              }}
              role="group"
              aria-label="Puestos del aula"
            >
              {seats.map((seat) => {
                const selected = locationCode === seat.code;
                const observed = observedSeats.has(seat.code);
                return <button
                  key={seat.code}
                  type="button"
                  className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : observed ? "border-success/50 bg-success/15 text-foreground hover:bg-success/25" : "border-border bg-card text-foreground hover:border-primary hover:bg-primary/10"}`}
                  aria-pressed={selected}
                  aria-label={`Puesto ${seat.code}, fila ${seat.row}, columna ${seat.column}${observed ? ", anotación docente registrada" : ", pendiente"}`}
                  onClick={() => setLocationCode(seat.code)}
                >
                  <span>{seat.code}</span>{observed && !selected && <span className="ml-1" aria-hidden="true">✓</span>}
                </button>;
              })}
            </div>
          </div>
          <p className="text-center text-sm" aria-live="polite">
            {locationCode ? <>Puesto seleccionado: <strong>{locationCode}</strong></> : "Selecciona el puesto del estudiante."}
          </p>
        </div>}

        <button type="button" className="w-full rounded bg-primary p-2 text-primary-foreground disabled:opacity-50" disabled={busy || !participantId || !observerId || !/^[A-Z0-9-]{2,16}$/.test(locationCode)} onClick={() => void schedule()}>
          Programar {options?.window_seconds ?? 5} segundos en {locationCode || "un puesto"}
        </button>
      </div>}

      {error && <p role="alert" className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded border border-success/30 bg-success/10 p-3 text-sm text-success">{notice}</p>}

      {!active && <p className="rounded border border-dashed border-border p-4 text-sm text-muted-foreground">No hay una ventana pendiente. Las anotaciones enviadas no pueden editarse.</p>}
      {active?.status === "scheduled" && <div className="rounded border border-secondary/30 bg-secondary/10 p-4">
        <p className="font-semibold">Objetivo: {active.target_code} · Puesto {active.location_code}</p>
        <p className="text-sm">La ventana inicia en {Math.max(0, Math.ceil(remainingMs / 1000))} segundos. Observe únicamente cuando el contador llegue a cero.</p>
      </div>}
      {active?.status === "observing" && <div className="rounded border border-secondary/40 bg-secondary/10 p-4" role="timer" aria-live="polite">
        <p className="font-semibold">Observe ahora: {active.target_code} · Puesto {active.location_code}</p>
        <p className="text-2xl font-bold tabular-nums">{Math.max(0, Math.ceil((new Date(active.ends_at).getTime() - clock) / 1000))}</p>
        <p className="text-sm">Los controles se habilitarán cuando finalice la ventana.</p>
      </div>}
      {active?.status === "ready" && <div className="space-y-3 rounded border border-warning/30 bg-warning/10 p-4">
        <p className="font-semibold">Objetivo: {active.target_code} · Puesto {active.location_code}</p>
        <p className="text-sm">Ventana asignada: {new Date(active.starts_at).toLocaleTimeString()}–{new Date(active.ends_at).toLocaleTimeString()}.</p>
        <ObserverAnnotationForm assignmentId={active.assignment_id} onSubmit={(value) => void submit(value)} />
      </div>}

      <details>
        <summary className="cursor-pointer text-sm font-medium">Estado de asignaciones recientes</summary>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {assignments.map((item) => <li key={item.assignment_id}>{item.target_code} · {observerStatusLabels[item.status]} · {item.manual_version}</li>)}
        </ul>
      </details>
    </section>
  );
}
