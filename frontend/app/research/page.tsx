"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, BACKEND_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { RESEARCH_DASHBOARD_ENABLED } from "../lib/features";

type Evidence = { status: string; report_reference: string | null };
type Cell = {
  cohort: string; model: string; profile: string; status: "published" | "suppressed";
  reason_code?: string; participant_band?: string;
  sample?: { total_windows: number; observable_windows: number; telemetry_samples: number };
  quality?: { coverage: number; mean_uncertainty: number; no_observable_ratio: number; unknown_ratio: number };
  observable_distribution?: { task_oriented_evidence_ratio: number; off_task_evidence_ratio: number; task_oriented_interval_95: { lower: number; upper: number; method: string } };
  resources?: Record<string, Record<string, number>>; registry_metrics?: Record<string, number>;
  validity_evidence?: Evidence; fairness_evidence?: Evidence;
  provenance?: Record<string, string | string[]>;
};
type Dashboard = {
  grant: { id: number; project: string; purpose: string; expires_at: string };
  filter_options: { cohorts: string[]; models: string[]; profiles: string[]; periods: string[] };
  privacy: { minimum_participants: number; minimum_observable_windows: number };
  cells: Cell[]; limitations: string[];
};
type Filters = { period: string; cohort: string; model: string; profile: string };

export default function ResearchPage() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [filters, setFilters] = useState<Filters>({ period: "90d", cohort: "", model: "", profile: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (next: Filters) => {
    if (!token || !RESEARCH_DASHBOARD_ENABLED) return;
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ period: next.period });
      if (next.cohort) params.set("cohort", next.cohort);
      if (next.model) params.set("model", next.model);
      if (next.profile) params.set("profile", next.profile);
      const data = await apiFetch<Dashboard>(`/api/research-dashboard/?${params}`, {}, token);
      setDashboard(data);
      setFilters((current) => ({
        period: current.period,
        cohort: current.cohort || data.filter_options.cohorts[0] || "",
        model: current.model || data.filter_options.models[0] || "",
        profile: current.profile || data.filter_options.profiles[0] || "",
      }));
    } catch { setError("No fue posible cargar un permiso de investigación vigente."); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => {
    if (!token) router.push("/login");
    else void load({ period: "90d", cohort: "", model: "", profile: "" });
  }, [token, router, load]);

  const exportCsv = async () => {
    if (!token || !dashboard || !filters.cohort || !filters.model || !filters.profile) return;
    setBusy(true); setError("");
    try {
      const lease = await apiFetch<{ download_token: string }>("/api/research-exports/", {
        method: "POST",
        body: JSON.stringify({ grant_id: dashboard.grant.id, ...filters, purpose: dashboard.grant.purpose, expires_in_minutes: 10 }),
      }, token);
      const response = await fetch(`${BACKEND_URL}/api/research-exports/download/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ download_token: lease.download_token }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("download_failed");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "visionclass-research-export.csv"; anchor.click();
      URL.revokeObjectURL(url);
    } catch { setError("La muestra protegida no puede exportarse con estos filtros."); }
    finally { setBusy(false); }
  };

  if (!RESEARCH_DASHBOARD_ENABLED) return <main className="min-h-screen p-8"><h1 className="text-2xl font-semibold">Panel de investigación no disponible</h1><p>La función permanece desactivada hasta completar la revisión independiente.</p></main>;

  return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold">Panel de investigación</h1><p className="text-sm text-slate-600">Evidencia observable agregada; no mide estados mentales ni habilita decisiones individuales.</p></div><button className="rounded border px-4 py-2" onClick={() => { logout(); router.push("/login"); }}>Cerrar sesión</button></header>
    {dashboard && <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Permiso y propósito</h2><p>{dashboard.grant.project}: {dashboard.grant.purpose}</p><p className="text-sm text-slate-600">Caduca: {new Date(dashboard.grant.expires_at).toLocaleString()}</p></section>}
    {dashboard && <section className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5" aria-label="Filtros de investigación">
      <Filter label="Periodo" value={filters.period} options={dashboard.filter_options.periods} onChange={(period) => setFilters({ ...filters, period })} />
      <Filter label="Cohorte" value={filters.cohort} options={dashboard.filter_options.cohorts} onChange={(cohort) => setFilters({ ...filters, cohort })} />
      <Filter label="Modelo" value={filters.model} options={dashboard.filter_options.models} onChange={(model) => setFilters({ ...filters, model })} />
      <Filter label="Perfil" value={filters.profile} options={dashboard.filter_options.profiles} onChange={(profile) => setFilters({ ...filters, profile })} />
      <button className="self-end rounded bg-slate-900 p-2 text-white disabled:opacity-50" disabled={busy} onClick={() => void load(filters)}>Aplicar filtros</button>
    </section>}
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
    {dashboard?.cells.map((cell) => <article key={`${cell.cohort}-${cell.model}`} className="rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">{cell.cohort} · {cell.model}</h2>{cell.status === "suppressed" ? <p className="mt-3 rounded bg-amber-50 p-3">Celda suprimida por protección de muestra ({cell.reason_code}). No se muestran conteos parciales.</p> : <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><p>Muestra: {cell.participant_band} participantes</p><p>Ventanas observables: {cell.sample?.observable_windows}</p><p>Cobertura: {Math.round((cell.quality?.coverage || 0) * 100)}%</p></div>
      <p>Incertidumbre técnica media: {cell.quality?.mean_uncertainty}. Distribución agregada orientada a tarea: {Math.round((cell.observable_distribution?.task_oriented_evidence_ratio || 0) * 100)}%. Intervalo descriptivo: {cell.observable_distribution?.task_oriented_interval_95.lower}–{cell.observable_distribution?.task_oriented_interval_95.upper}.</p>
      <div className="grid gap-3 md:grid-cols-2"><EvidenceCard title="Validez" value={cell.validity_evidence} /><EvidenceCard title="Equidad" value={cell.fairness_evidence} /></div>
      <details><summary className="cursor-pointer font-medium">Proveniencia, versiones y recursos</summary><pre className="mt-2 overflow-auto rounded bg-slate-950 p-3 text-xs text-white">{JSON.stringify({ provenance: cell.provenance, registry_metrics: cell.registry_metrics, resources: cell.resources }, null, 2)}</pre></details>
    </div>}</article>)}
    {dashboard && <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Exportación protegida</h2><p className="text-sm text-slate-600">CSV seudonimizado, de un solo uso, con propósito y caducidad. Exige al menos {dashboard.privacy.minimum_participants} participantes y {dashboard.privacy.minimum_observable_windows} ventanas observables.</p><button className="mt-3 rounded bg-cyan-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy} onClick={() => void exportCsv()}>Exportar selección exacta</button></section>}
    {dashboard && <ul className="list-disc space-y-1 pl-6 text-sm text-slate-600">{dashboard.limitations.map((item) => <li key={item}>{item}</li>)}</ul>}
  </div></main>;
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-sm">{label}<select className="mt-1 w-full rounded border p-2" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
function EvidenceCard({ title, value }: { title: string; value?: Evidence }) {
  return <div className="rounded border p-3"><h3 className="font-medium">{title}</h3><p>Estado: {value?.status || "not_linked"}</p><p className="text-sm text-slate-600">Referencia: {value?.report_reference || "No vinculada; no se presenta ninguna afirmación."}</p></div>;
}
