"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { QuizAttemptApi } from "../../lib/api-types";

const LEGACY_MODULE_KEY = "legacy";

const studentName = (attempt: QuizAttemptApi) => {
  const fullName = [attempt.user?.first_name, attempt.user?.last_name].filter(Boolean).join(" ").trim();
  return fullName || attempt.user?.username || attempt.user?.email || "Estudiante";
};

const studentKey = (attempt: QuizAttemptApi) =>
  String(attempt.user?.id ?? attempt.user?.email ?? attempt.user?.username ?? "unknown");

const attemptTime = (attempt: QuizAttemptApi) => {
  const value = Date.parse(attempt.created_at || "");
  return Number.isNaN(value) ? 0 : value;
};

const formattedDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
};

type QuizColumn = { key: string; title: string; order: number };
type GradeCell = { latest?: QuizAttemptApi; attempts: number };
type StudentGradeRow = {
  key: string;
  name: string;
  cells: Map<string, GradeCell>;
  average: number | null;
};
type ModuleReport = {
  key: string;
  title: string;
  order: number;
  legacy: boolean;
  quizzes: QuizColumn[];
  students: StudentGradeRow[];
};
type CourseReport = { id: number; title: string; modules: ModuleReport[] };

const buildReports = (attempts: QuizAttemptApi[]): CourseReport[] => {
  type ModuleBuilder = Omit<ModuleReport, "quizzes" | "students"> & {
    quizMap: Map<string, QuizColumn>;
    attempts: QuizAttemptApi[];
  };
  type CourseBuilder = Omit<CourseReport, "modules"> & { moduleMap: Map<string, ModuleBuilder> };
  const courseMap = new Map<number, CourseBuilder>();

  for (const attempt of attempts) {
    const course = attempt.session.course;
    const courseModule = attempt.material?.lesson.module;
    const courseEntry = courseMap.get(course.id) || {
      id: course.id,
      title: course.title,
      moduleMap: new Map<string, ModuleBuilder>(),
    };
    courseMap.set(course.id, courseEntry);

    const moduleKey = courseModule ? String(courseModule.id) : LEGACY_MODULE_KEY;
    const moduleEntry = courseEntry.moduleMap.get(moduleKey) || {
      key: moduleKey,
      title: courseModule?.title || "Evaluaciones anteriores",
      order: courseModule?.order ?? Number.MAX_SAFE_INTEGER,
      legacy: !courseModule,
      quizMap: new Map<string, QuizColumn>(),
      attempts: [],
    };
    courseEntry.moduleMap.set(moduleKey, moduleEntry);

    const quizKey = attempt.material ? `material-${attempt.material.id}` : `legacy-${attempt.reason || "evaluacion"}`;
    moduleEntry.quizMap.set(quizKey, {
      key: quizKey,
      title: attempt.material?.title || attempt.reason || "Evaluación",
      order: attempt.material?.lesson.order ?? Number.MAX_SAFE_INTEGER,
    });
    moduleEntry.attempts.push(attempt);
  }

  return [...courseMap.values()]
    .sort((a, b) => a.title.localeCompare(b.title, "es"))
    .map((course) => ({
      id: course.id,
      title: course.title,
      modules: [...course.moduleMap.values()]
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "es"))
        .map((moduleEntry) => {
          const quizzes = [...moduleEntry.quizMap.values()].sort(
            (a, b) => a.order - b.order || a.title.localeCompare(b.title, "es"),
          );
          const students = new Map<string, { name: string; attempts: Map<string, QuizAttemptApi[]> }>();

          for (const attempt of moduleEntry.attempts) {
            const key = studentKey(attempt);
            const entry = students.get(key) || { name: studentName(attempt), attempts: new Map() };
            students.set(key, entry);
            const quizKey = attempt.material ? `material-${attempt.material.id}` : `legacy-${attempt.reason || "evaluacion"}`;
            const quizAttempts = entry.attempts.get(quizKey) || [];
            quizAttempts.push(attempt);
            entry.attempts.set(quizKey, quizAttempts);
          }

          const rows = [...students.entries()]
            .map(([key, student]) => {
              const cells = new Map<string, GradeCell>();
              const scores: number[] = [];
              for (const quiz of quizzes) {
                const quizAttempts = [...(student.attempts.get(quiz.key) || [])].sort(
                  (a, b) => attemptTime(b) - attemptTime(a) || b.id - a.id,
                );
                const latest = quizAttempts[0];
                cells.set(quiz.key, { latest, attempts: quizAttempts.length });
                if (latest?.score !== null && latest?.score !== undefined) scores.push(latest.score);
              }
              return {
                key,
                name: student.name,
                cells,
                average: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null,
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name, "es"));

          return {
            key: moduleEntry.key,
            title: moduleEntry.title,
            order: moduleEntry.order,
            legacy: moduleEntry.legacy,
            quizzes,
            students: rows,
          };
        }),
    }));
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

  const reports = useMemo(() => buildReports(attempts), [attempts]);

  return (
    <section aria-labelledby="grade-report-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary"><ClipboardCheck className="h-5 w-5" /></span>
          <div>
            <h2 id="grade-report-title" className="text-xl font-semibold text-foreground">Reporte de calificaciones</h2>
            <p className="mt-1 text-sm text-muted-foreground">Notas organizadas por curso, módulo y evaluación. Se muestra el intento más reciente.</p>
          </div>
        </div>
      </div>

      {loading && <p role="status" className="p-6 text-sm text-muted-foreground">Cargando calificaciones…</p>}
      {error && <p role="alert" className="m-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && !reports.length && (
        <p className="p-8 text-center text-sm text-muted-foreground">Todavía no existen evaluaciones calificadas.</p>
      )}
      {!loading && !error && reports.map((course) => (
        <article key={course.id} className="border-b border-border p-6 last:border-b-0">
          <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
          <div className="mt-4 space-y-6">
            {course.modules.map((moduleReport) => (
              <section key={moduleReport.key} aria-labelledby={`grade-module-${course.id}-${moduleReport.key}`}>
                <div className="mb-3">
                  <h4 id={`grade-module-${course.id}-${moduleReport.key}`} className="font-semibold text-foreground">{moduleReport.title}</h4>
                  {moduleReport.legacy && (
                    <p className="mt-1 text-xs text-warning">Estas notas se registraron antes de enlazar cada intento con su módulo.</p>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[680px]">
                    <thead className="bg-muted text-left text-sm text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Estudiante</th>
                        {moduleReport.quizzes.map((quiz) => (
                          <th key={quiz.key} className="px-4 py-3 font-medium">{quiz.title}</th>
                        ))}
                        <th className="px-4 py-3 font-medium">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleReport.students.map((student) => (
                        <tr key={student.key} className="border-t border-border text-sm text-foreground">
                          <td className="px-4 py-4 font-medium text-foreground">{student.name}</td>
                          {moduleReport.quizzes.map((quiz) => {
                            const cell = student.cells.get(quiz.key);
                            const score = cell?.latest?.score;
                            return (
                              <td key={quiz.key} className="px-4 py-4">
                                {score === null || score === undefined ? (
                                  <span className="text-muted-foreground">Sin intento</span>
                                ) : (
                                  <div>
                                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{Math.round(score)}%</span>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {formattedDate(cell?.latest?.created_at)}{cell && cell.attempts > 1 ? ` · ${cell.attempts} intentos` : ""}
                                    </p>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-4 font-semibold text-foreground">
                            {student.average === null ? "—" : `${Math.round(student.average)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
