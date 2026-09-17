"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { revokeCaptureConsent } from "../lib/consent";
import { useAuth } from "../context/AuthContext";

type SessionEvidence = {
  label: string;
  started_at: string;
  completed: boolean;
  total_windows: number;
  observable_windows: number;
  no_observable_windows: number;
  unknown_windows: number;
  task_oriented_evidence_windows: number;
  off_task_evidence_windows: number;
  coverage: number | null;
  task_oriented_evidence_ratio: number | null;
  mean_uncertainty: number | null;
  partial: boolean;
};

type DashboardResponse = {
  schema_version: "student-evidence-dashboard-v1";
  state: "empty" | "partial" | "ready";
  sessions: SessionEvidence[];
  definitions: {
    observation: string;
    inference: string;
    no_observable: string;
    self_report: string;
  };
  limitations: string[];
  privacy: {
    capture_allowed: boolean;
    consent_enabled: boolean;
    consent_text_approved: boolean;
    current_version: string;
    images_stored: false;
    teacher_access: false;
  };
};

function percentage(value: number | null) {
  return value === null ? "No disponible" : `${Math.round(value * 100)} %`;
}

function SessionCard({ session }: { session: SessionEvidence }) {
  const coverageValue = Math.round((session.coverage ?? 0) * 100);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{session.label}</h3>
          <p className="text-sm text-slate-500">
            {new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(session.started_at),
            )}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
          {session.completed ? "Finalizada" : "En curso"}
        </span>
      </div>

      {session.partial && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Esta sesión tiene datos parciales. No la uses para interpretar una tendencia.
        </p>
      )}

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm font-medium text-slate-600">Cobertura observable</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">{percentage(session.coverage)}</dd>
          <progress
            className="mt-2 h-2 w-full"
            aria-label={`Cobertura observable de ${session.label}`}
            max={100}
            value={coverageValue}
          />
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Ventanas no observables</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">{session.no_observable_windows}</dd>
          <p className="mt-1 text-xs text-slate-500">de {session.total_windows} ventanas</p>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Incertidumbre técnica media</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">
            {percentage(session.mean_uncertainty)}
          </dd>
          <p className="mt-1 text-xs text-slate-500">Sólo sobre evidencia observable.</p>
        </div>
      </dl>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">Distribución de evidencia observable</p>
        {session.observable_windows === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No hay evidencia suficiente para mostrar una distribución.</p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Orientada a la tarea: {session.task_oriented_evidence_windows} · Fuera de la tarea: {session.off_task_evidence_windows}.
            Estas categorías describen señales visibles, no tu estado mental.
          </p>
        )}
      </div>
    </article>
  );
}

export function EvidenceDashboardSection() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<DashboardResponse>("/api/student-evidence-dashboard/", {}, token)
      .then((response) => {
        if (!cancelled) setDashboard(response);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar tu evidencia. Inténtalo de nuevo más tarde.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const revokeCapture = async () => {
    if (!token || revoking) return;
    setRevoking(true);
    setPrivacyMessage("");
    try {
      await revokeCaptureConsent(token);
      setDashboard((current) => current && {
        ...current,
        privacy: { ...current.privacy, capture_allowed: false },
      });
      setPrivacyMessage("La captura quedó pausada y los permisos de captura fueron revocados.");
    } catch {
      setPrivacyMessage("No se pudo revocar la captura. No inicies una nueva sesión y vuelve a intentarlo.");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <p role="status" className="rounded-xl bg-white p-6 text-slate-600">Cargando tu evidencia…</p>;
  }
  if (error || !dashboard) {
    return <p role="alert" className="rounded-xl bg-red-50 p-6 text-red-800">{error}</p>;
  }

  return (
    <section aria-labelledby="student-evidence-title" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Tu información, bajo tu control</p>
        <h1 id="student-evidence-title" className="mt-2 text-2xl font-bold text-slate-950">
          Evidencia observable de tus sesiones
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Este panel muestra señales técnicas por sesión. No asigna una etiqueta permanente, no te compara con otras
          personas y no mide directamente lo que piensas o aprendes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(dashboard.definitions).map(([key, value]) => {
          const labels: Record<string, string> = {
            observation: "Observación",
            inference: "Inferencia técnica",
            no_observable: "No observable",
            self_report: "Autoinforme",
          };
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">{labels[key]}</h2>
              <p className="mt-1 text-sm text-slate-600">{value}</p>
            </div>
          );
        })}
      </div>

      {dashboard.state === "empty" ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-900">Aún no hay sesiones para mostrar</h2>
          <p className="mt-2 text-sm text-slate-600">Cuando exista evidencia autorizada, aparecerá aquí por sesión.</p>
        </div>
      ) : (
        <div className="space-y-4" aria-label="Tendencia por sesión">
          {dashboard.sessions.map((session) => <SessionCard key={`${session.label}-${session.started_at}`} session={session} />)}
        </div>
      )}

      <aside className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white" aria-labelledby="limits-title">
        <h2 id="limits-title" className="text-lg font-semibold">Cómo leer estos datos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-200">
          {dashboard.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="text-lg font-semibold text-slate-900">Privacidad y consentimiento</h2>
        <p className="mt-2 text-sm text-slate-600">
          Captura: {dashboard.privacy.capture_allowed ? "autorizada" : "pausada"}. No se almacenan imágenes y este
          panel no habilita acceso docente a tus datos individuales.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={revokeCapture}
            disabled={revoking || !dashboard.privacy.capture_allowed}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {revoking ? "Revocando…" : "Pausar y revocar captura"}
          </button>
          <Link href="/privacidad" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Ver política de datos
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-700" aria-live="polite">{privacyMessage}</p>
      </section>
    </section>
  );
}
