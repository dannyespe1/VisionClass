"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { QuizAttemptApi } from "../../lib/api-types";

const studentName = (attempt: QuizAttemptApi) => {
  const fullName = [attempt.user?.first_name, attempt.user?.last_name].filter(Boolean).join(" ").trim();
  return fullName || attempt.user?.username || attempt.user?.email || "Estudiante";
};

const formattedDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
};

export function GradeReportSection() {
  const { token } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttemptApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiFetch<QuizAttemptApi[]>("/api/quiz-attempts/", {}, token)
      .then((data) => {
        if (active) setAttempts(data || []);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "No se pudieron cargar las calificaciones");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const rows = useMemo(
    () => [...attempts].sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || "")),
    [attempts],
  );

  return (
    <section aria-labelledby="grade-report-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><ClipboardCheck className="h-5 w-5" /></span>
          <div>
            <h2 id="grade-report-title" className="text-xl font-semibold text-slate-950">Reporte de calificaciones</h2>
            <p className="mt-1 text-sm text-slate-600">Resultados académicos individuales de estudiantes inscritos en tus cursos.</p>
          </div>
        </div>
      </div>

      {loading && <p role="status" className="p-6 text-sm text-slate-600">Cargando calificaciones…</p>}
      {error && <p role="alert" className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Estudiante</th>
                <th className="px-6 py-3 font-medium">Curso</th>
                <th className="px-6 py-3 font-medium">Evaluación</th>
                <th className="px-6 py-3 font-medium">Calificación</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((attempt) => (
                <tr key={attempt.id} className="border-t border-slate-100 text-sm text-slate-700">
                  <td className="px-6 py-4 font-medium text-slate-950">{studentName(attempt)}</td>
                  <td className="px-6 py-4">{attempt.session.course.title}</td>
                  <td className="px-6 py-4">{attempt.reason || "Quiz"}</td>
                  <td className="px-6 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">{attempt.score === null ? "—" : `${Math.round(attempt.score)}%`}</span></td>
                  <td className="px-6 py-4 text-slate-500">{formattedDate(attempt.created_at)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">Todavía no existen evaluaciones calificadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
