"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Clock, Target } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type AcademicMetrics = {
  courses_completed: number;
  total_courses: number;
  study_hours_week: number;
  average_grade: number;
};

type CourseBreakdown = {
  id: number | null;
  name: string;
  progress: number;
  grade: number;
  attention_avg: number;
  study_hours: number;
};

type StudentMetrics = {
  academic_metrics: AcademicMetrics;
  attention_trend: Array<{ label: string; attention: number; performance: number }>;
  course_breakdown: CourseBreakdown[];
  recommendations: Array<{ title: string; description: string; priority: string }>;
};

export function EstadisticasSection() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<StudentMetrics>("/api/student-metrics/", {}, token)
      .then(setMetrics)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar las estadísticas");
      });
  }, [token]);

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  }
  if (!metrics) {
    return <div className="p-6 text-sm text-slate-500">Cargando estadísticas...</div>;
  }

  const academic = metrics.academic_metrics;
  const cards = [
    { label: "Cursos completados", value: academic.courses_completed, icon: BookOpen },
    { label: "Cursos totales", value: academic.total_courses, icon: Target },
    { label: "Horas esta semana", value: academic.study_hours_week, icon: Clock },
    { label: "Calificación promedio", value: academic.average_grade, icon: Activity },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Estadísticas de aprendizaje</h2>
        <p className="text-sm text-slate-500">Resumen académico y señales derivadas de las sesiones de curso.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className="mb-3 h-5 w-5 text-blue-600" />
            <div className="text-2xl font-semibold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-900">Progreso por curso</h3>
        <div className="space-y-4">
          {metrics.course_breakdown.length ? metrics.course_breakdown.map((course) => (
            <div key={course.id ?? course.name} className="rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="font-medium text-slate-800">{course.name}</span>
                <span className="text-sm text-slate-500">{course.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, course.progress))}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <span>Atención {course.attention_avg}%</span>
                <span>Calificación {course.grade}</span>
                <span>{course.study_hours} h</span>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">Aún no hay sesiones suficientes.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">Recomendaciones</h3>
        <div className="space-y-3">
          {metrics.recommendations.map((item) => (
            <div key={`${item.priority}-${item.title}`} className="rounded-xl border border-slate-100 p-4">
              <div className="font-medium text-slate-800">{item.title}</div>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
