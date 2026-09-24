"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

type Interval = {
  lower: number;
  upper: number;
  method: "participant_mean_normal_approximation";
};

type TrendPoint =
  | { period_start: string; status: "suppressed"; reason_code: string }
  | {
      period_start: string;
      status: "published";
      coverage: number;
      mean_uncertainty: number | null;
      task_oriented_evidence_ratio: number;
      task_oriented_interval_95: Interval;
    };

type ActivityBase = {
  course_id: number;
  course_title: string;
  activity_label: string;
  resource_kind: "text" | "video" | "activity";
};

type SuppressedActivity = ActivityBase & {
  status: "suppressed";
  reason_code: string;
  minimum_participants: number;
};

type PublishedActivity = ActivityBase & {
  status: "published";
  participant_band: string;
  total_windows: number;
  observable_windows: number;
  coverage: number;
  mean_uncertainty: number | null;
  distribution: {
    task_oriented_evidence_ratio: number;
    off_task_evidence_ratio: number;
    no_observable_ratio: number;
    unknown_ratio: number;
  };
  task_oriented_interval_95: Interval;
  trend: TrendPoint[];
};

type DashboardResponse = {
  schema_version: "teacher-group-dashboard-v1";
  state: "empty" | "ready";
  filters: { period: "30d" | "90d" | "all"; course_id: number | null };
  courses: Array<{ id: number; title: string }>;
  academic_results: Array<{
    course_id: number;
    course_title: string;
    enrollment_count: number;
    completed_enrollment_count: number;
    attempt_count: number;
    average_score: number | null;
    latest_score: number | null;
    latest_attempt_at: string | null;
    passing_score: number;
    pass_rate: number | null;
  }>;
  activities: Array<SuppressedActivity | PublishedActivity>;
  privacy: {
    minimum_participants: number;
    minimum_observable_windows: number;
    individual_states_available: false;
    exact_small_group_counts_available: false;
    complementary_period_suppression: true;
  };
  definitions: Record<string, string>;
  limitations: string[];
};

const resourceLabels = { text: "Texto", video: "Video", activity: "Actividad" };

function percent(value: number | null) {
  return value === null ? "No disponible" : `${Math.round(value * 100)} %`;
}

function score(value: number | null) {
  return value === null ? "Sin datos" : `${value.toLocaleString("es-EC", { maximumFractionDigits: 1 })} %`;
}

function dateTime(value: string | null) {
  if (!value) return "Sin intentos";
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function suppressionMessage(reason: string, minimum: number) {
  if (reason === "complementary_period_suppression") {
    return "Se ocultó este periodo porque compararlo con otro permitiría aislar un grupo pequeño.";
  }
  if (reason === "minimum_observable_windows") {
    return "No hay suficientes ventanas observables para publicar una métrica estable.";
  }
  if (reason === "minimum_observable_participants") {
    return `Menos de ${minimum} participantes aportaron evidencia observable.`;
  }
  if (reason === "missing_uncertainty") {
    return "Falta incertidumbre técnica en una o más ventanas observables.";
  }
  return `El grupo no alcanza el mínimo de ${minimum} participantes.`;
}

function TrendTable({ trend }: { trend: TrendPoint[] }) {
  if (!trend.length) return <p className="mt-3 text-sm text-slate-600">No hay periodos para mostrar.</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <caption className="sr-only">Tendencia semanal agregada de la actividad</caption>
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            <th className="px-2 py-2 font-medium">Semana</th>
            <th className="px-2 py-2 font-medium">Cobertura</th>
            <th className="px-2 py-2 font-medium">Evidencia orientada a tarea</th>
            <th className="px-2 py-2 font-medium">Incertidumbre</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((point) => (
            <tr key={point.period_start} className="border-b border-slate-100">
              <td className="px-2 py-3">{point.period_start}</td>
              {point.status === "suppressed" ? (
                <td colSpan={3} className="px-2 py-3 text-slate-500">Suprimido por privacidad o suficiencia.</td>
              ) : (
                <>
                  <td className="px-2 py-3">{percent(point.coverage)}</td>
                  <td className="px-2 py-3">
                    {percent(point.task_oriented_evidence_ratio)} ({percent(point.task_oriented_interval_95.lower)}–{percent(point.task_oriented_interval_95.upper)})
                  </td>
                  <td className="px-2 py-3">{percent(point.mean_uncertainty)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityCard({ activity }: { activity: SuppressedActivity | PublishedActivity }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{activity.course_title}</p>
          <h2 className="text-lg font-semibold text-slate-950">{activity.activity_label}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
          {resourceLabels[activity.resource_kind]}
        </span>
      </div>

      {activity.status === "suppressed" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
          <p className="font-medium text-amber-950">Datos suprimidos</p>
          <p className="mt-1 text-sm text-amber-900">
            {suppressionMessage(activity.reason_code, activity.minimum_participants)} No se muestran conteos ni métricas parciales.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-600">Tamaño del grupo: banda {activity.participant_band}; nunca se muestra el conteo exacto de un grupo pequeño.</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-600">Cobertura observable</dt>
              <dd className="mt-1 text-xl font-semibold">{percent(activity.coverage)}</dd>
              <progress aria-label={`Cobertura de ${activity.activity_label}`} className="mt-2 h-2 w-full" max={100} value={Math.round(activity.coverage * 100)} />
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-600">Incertidumbre técnica media</dt>
              <dd className="mt-1 text-xl font-semibold">{percent(activity.mean_uncertainty)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-600">Ventanas observables</dt>
              <dd className="mt-1 text-xl font-semibold">{activity.observable_windows}</dd>
              <p className="mt-1 text-xs text-slate-500">de {activity.total_windows} ventanas agregadas</p>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900">Distribución agregada</h3>
            <ul className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <li>Orientada a la tarea: {percent(activity.distribution.task_oriented_evidence_ratio)}</li>
              <li>Fuera de la tarea: {percent(activity.distribution.off_task_evidence_ratio)}</li>
              <li>No observable: {percent(activity.distribution.no_observable_ratio)}</li>
              <li>Desconocida: {percent(activity.distribution.unknown_ratio)}</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Intervalo descriptivo orientado a tarea: {percent(activity.task_oriented_interval_95.lower)}–{percent(activity.task_oriented_interval_95.upper)}. No es una medida individual.
            </p>
          </div>
          <TrendTable trend={activity.trend} />
        </>
      )}
    </article>
  );
}

export function TeacherGroupDashboardSection() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [period, setPeriod] = useState<"30d" | "90d" | "all">("90d");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({ period });
    if (courseId) params.set("course_id", courseId);
    apiFetch<DashboardResponse>(`/api/teacher-group-dashboard/?${params.toString()}`, {}, token)
      .then((response) => {
        if (!cancelled) setDashboard(response);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar los agregados protegidos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, period, token]);

  return (
    <section aria-labelledby="teacher-group-title" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Agregados con privacidad</p>
        <h1 id="teacher-group-title" className="mt-2 text-2xl font-bold text-slate-950">Evidencia grupal por actividad</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Interpreta cobertura, incertidumbre y distribución del grupo como señales observables, no estados mentales. Este panel no muestra estudiantes, no genera rankings y no permite vigilancia individual.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Curso
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={courseId}
            onChange={(event) => {
              setLoading(true);
              setError(null);
              setCourseId(event.target.value);
            }}
          >
            <option value="">Todos mis cursos</option>
            {(dashboard?.courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Periodo
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={period}
            onChange={(event) => {
              setLoading(true);
              setError(null);
              setPeriod(event.target.value as "30d" | "90d" | "all");
            }}
          >
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el historial autorizado</option>
          </select>
        </label>
      </div>

      {loading && <p role="status" className="rounded-xl bg-white p-6 text-slate-600">Cargando agregados protegidos…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-6 text-red-800">{error}</p>}
      {!loading && !error && dashboard && (
        <section aria-labelledby="academic-results-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Seguimiento académico</p>
            <h2 id="academic-results-title" className="mt-1 text-xl font-semibold text-slate-950">Resultados de cursos y evaluaciones</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Resume matrículas e intentos calificados de todo el historial del curso. Estas notas se presentan separadas de la evidencia de atención y no se usan para inferir estados mentales.
            </p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {dashboard.academic_results.map((result) => (
              <article key={result.course_id} className="rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-950">{result.course_title}</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    Aprobación desde {score(result.passing_score)}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs text-slate-600">Matrículas</dt>
                    <dd className="mt-1 text-xl font-semibold text-slate-950">
                      {result.enrollment_count}
                      <span className="block text-xs font-normal text-slate-500">{result.completed_enrollment_count} completadas</span>
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs text-slate-600">Intentos calificados</dt>
                    <dd className="mt-1 text-xl font-semibold text-slate-950">{result.attempt_count}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs text-slate-600">Promedio</dt>
                    <dd className="mt-1 text-xl font-semibold text-slate-950">{score(result.average_score)}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs text-slate-600">Tasa de aprobación</dt>
                    <dd className="mt-1 text-xl font-semibold text-slate-950">{score(result.pass_rate)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
                  <span className="text-slate-600">Última calificación: <strong className="text-slate-950">{score(result.latest_score)}</strong></span>
                  <time className="text-slate-500" dateTime={result.latest_attempt_at ?? undefined}>{dateTime(result.latest_attempt_at)}</time>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {!loading && !error && dashboard?.state === "empty" && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-900">No hay evidencia de atención agregable</h2>
          <p className="mt-2 text-sm text-slate-600">Esta sección aparecerá cuando existan eventos autorizados y suficientes; los resultados académicos se muestran arriba.</p>
        </div>
      )}
      {!loading && !error && dashboard?.activities.map((activity) => (
        <ActivityCard key={`${activity.course_id}-${activity.activity_label}`} activity={activity} />
      ))}

      {dashboard && (
        <aside className="rounded-2xl bg-slate-900 p-6 text-white" aria-labelledby="teacher-limits-title">
          <h2 id="teacher-limits-title" className="text-lg font-semibold">Límites de interpretación y privacidad</h2>
          <p className="mt-2 text-sm text-slate-300">
            Umbral: al menos {dashboard.privacy.minimum_participants} participantes y {dashboard.privacy.minimum_observable_windows} ventanas observables. También se suprimen periodos cuyo complemento pueda revelar un grupo pequeño.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-200">
            {dashboard.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
        </aside>
      )}
    </section>
  );
}
