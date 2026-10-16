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
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">{session.label}</h3>
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(session.started_at),
            )}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {session.completed ? "Finalizada" : "En curso"}
        </span>
      </div>

      {session.partial && (
        <p className="mt-4 rounded-lg bg-warning/10 p-3 text-sm text-foreground" role="status">
          Esta sesión tiene datos parciales. No la uses para interpretar una tendencia.
        </p>
      )}

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Cobertura observable</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{percentage(session.coverage)}</dd>
          <progress
            className="mt-2 h-2 w-full"
            aria-label={`Cobertura observable de ${session.label}`}
            max={100}
            value={coverageValue}
          />
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Ventanas no observables</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{session.no_observable_windows}</dd>
          <p className="mt-1 text-xs text-muted-foreground">de {session.total_windows} ventanas</p>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Incertidumbre técnica media</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">
            {percentage(session.mean_uncertainty)}
          </dd>
          <p className="mt-1 text-xs text-muted-foreground">Solo sobre evidencia observable.</p>
        </div>
      </dl>

      <div className="mt-5 rounded-xl bg-muted p-4">
        <p className="text-sm font-medium text-foreground">Distribución de evidencia observable</p>
        {session.observable_windows === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No hay evidencia suficiente para mostrar una distribución.</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
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
    return <p role="status" className="rounded-xl bg-card p-6 text-muted-foreground">Cargando tu evidencia…</p>;
  }
  if (error || !dashboard) {
    return <p role="alert" className="rounded-xl bg-destructive/10 p-6 text-destructive">{error}</p>;
  }

  return (
    <section aria-labelledby="student-evidence-title" className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Tu información, bajo tu control</p>
        <h1 id="student-evidence-title" className="mt-2 text-2xl font-bold text-foreground">
          Evidencia observable de tus sesiones
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
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
            <div key={key} className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground">{labels[key]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{value}</p>
            </div>
          );
        })}
      </div>

      {dashboard.state === "empty" ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="font-semibold text-foreground">Aún no hay sesiones para mostrar</h2>
          <p className="mt-2 text-sm text-muted-foreground">Cuando exista evidencia autorizada, aparecerá aquí por sesión.</p>
        </div>
      ) : (
        <div className="space-y-4" aria-label="Tendencia por sesión">
          {dashboard.sessions.map((session) => <SessionCard key={`${session.label}-${session.started_at}`} session={session} />)}
        </div>
      )}

      <aside className="rounded-2xl border border-border bg-aten-bg-dark p-6 text-[var(--aten-text-dark)]" aria-labelledby="limits-title">
        <h2 id="limits-title" className="text-lg font-semibold">Cómo leer estos datos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--aten-text-muted-dark)]">
          {dashboard.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
      </aside>

      <section className="rounded-2xl border border-border bg-card p-6" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="text-lg font-semibold text-foreground">Privacidad y consentimiento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Captura: {dashboard.privacy.capture_allowed ? "autorizada" : "pausada"}. En el modo predeterminado no se
          transmiten ni persisten imágenes ni video. El acceso docente se limita a evidencia agregada cuando el protocolo lo autoriza.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={revokeCapture}
            disabled={revoking || !dashboard.privacy.capture_allowed}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {revoking ? "Revocando…" : "Pausar y revocar captura"}
          </button>
          <Link href="/privacidad" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground">
            Ver política de datos
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">{privacyMessage}</p>
      </section>
    </section>
  );
}
