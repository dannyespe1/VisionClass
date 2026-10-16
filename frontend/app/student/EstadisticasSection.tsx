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
    return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>;
  }
  if (!metrics) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando estadísticas…</div>;
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
        <h2 className="text-2xl font-semibold text-foreground">Resumen académico y de sesiones</h2>
        <p className="text-sm text-muted-foreground">Resumen académico y señales derivadas de las sesiones de curso.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <Icon className="mb-3 h-5 w-5 text-primary" />
            <div className="text-2xl font-semibold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Progreso por curso</h3>
        <div className="space-y-4">
          {metrics.course_breakdown.length ? metrics.course_breakdown.map((course) => (
            <div key={course.id ?? course.name} className="rounded-xl bg-muted p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="font-medium text-foreground">{course.name}</span>
                <span className="text-sm text-muted-foreground">{course.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, course.progress))}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>Cobertura de señal {course.attention_avg}%</span>
                <span>Calificación {course.grade}</span>
                <span>{course.study_hours} h</span>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">Aún no hay sesiones suficientes.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-foreground">Sugerencias académicas</h3>
        <div className="space-y-3">
          {metrics.recommendations.map((item) => (
            <div key={`${item.priority}-${item.title}`} className="rounded-xl border border-border p-4">
              <div className="font-medium text-foreground">{item.title}</div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
