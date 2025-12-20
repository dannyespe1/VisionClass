"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Award, Eye, Clock, BookOpen, Target, Lightbulb } from "lucide-react";
import { Progress } from "../ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const BASELINE_TITLE = "baseline d2r";

type EnrollmentItem = {
  id: number;
  status: string;
  enrollment_data?: Record<string, any>;
  course?: { id: number; title: string };
};

type SessionItem = {
  id: number;
  course?: { id: number; title: string };
  mean_attention?: number;
  low_attention_ratio?: number;
  frame_count?: number;
  created_at?: string;
  last_score?: number | null;
};

type D2RItem = {
  id: number;
  session?: { id: number; course?: { title?: string } };
  raw_score: number;
  processing_speed: number;
  attention_span: number;
  errors: number;
  created_at: string;
};

type LessonItem = {
  id: number;
  title: string;
  order: number;
  moduleId: number;
  moduleOrder: number;
  courseId: number;
};

export function EstadisticasSection() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [d2rResults, setD2RResults] = useState<D2RItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [sess, d2r, enrolls, modulesData, lessonsData] = await Promise.all([
          apiFetch<SessionItem[]>("/api/sessions/", {}, token),
          apiFetch<D2RItem[]>("/api/d2r-results/", {}, token),
          apiFetch<EnrollmentItem[]>("/api/enrollments/", {}, token),
          apiFetch<any[]>("/api/course-modules/", {}, token),
          apiFetch<any[]>("/api/course-lessons/", {}, token),
        ]);
        setSessions(sess || []);
        setD2RResults(d2r || []);
        setEnrollments(enrolls || []);
        const mappedModules = (modulesData || [])
          .filter((m) => (m.course?.title || "").toLowerCase() !== BASELINE_TITLE)
          .map((m) => ({
            id: m.id,
            order: m.order || 0,
            courseId: m.course?.id,
          }));
        const mappedLessons = (lessonsData || [])
          .filter((l) => (l.module?.course?.title || "").toLowerCase() !== BASELINE_TITLE)
          .map((l) => ({
            id: l.id,
            title: l.title || "Leccion",
            order: l.order || 0,
            moduleId: l.module?.id,
            moduleOrder: mappedModules.find((m) => m.id === l.module?.id)?.order || 0,
            courseId: l.module?.course?.id,
          }));
        setLessons(mappedLessons);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar las estadisticas";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const filteredSessions = useMemo(
    () => sessions.filter((s) => (s.course?.title || "").toLowerCase() !== BASELINE_TITLE),
    [sessions]
  );

  const filteredEnrollments = useMemo(
    () => enrollments.filter((e) => (e.course?.title || "").toLowerCase() !== BASELINE_TITLE),
    [enrollments]
  );

  const attentionAverage = useMemo(() => {
    if (!filteredSessions.length) return 0;
    const sum = filteredSessions.reduce((acc, s) => acc + (s.mean_attention || 0), 0);
    return Math.round((sum / filteredSessions.length) * 100);
  }, [filteredSessions]);

  const lowAttentionRatio = useMemo(() => {
    if (!filteredSessions.length) return 0;
    const sum = filteredSessions.reduce((acc, s) => acc + (s.low_attention_ratio || 0), 0);
    return Math.round((sum / filteredSessions.length) * 100);
  }, [filteredSessions]);

  const baselineAttention = useMemo(() => {
    if (!d2rResults.length) return 0;
    const sum = d2rResults.reduce((acc, r) => acc + (r.attention_span || 0), 0);
    return Math.round(sum / d2rResults.length);
  }, [d2rResults]);

  const latestBaseline = useMemo(() => {
    if (!d2rResults.length) return null;
    const sorted = [...d2rResults].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
    const latest = sorted[0];
    return {
      score: Math.round(latest.raw_score || 0),
      attention: Math.round(latest.attention_span || 0),
      date: latest.created_at ? new Date(latest.created_at).toLocaleDateString() : "",
    };
  }, [d2rResults]);

  const totalFrames = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + (s.frame_count || 0), 0),
    [filteredSessions]
  );

  const courseProgress = useMemo(() => {
    const byCourse: Record<
      string,
      {
        id: number | null;
        name: string;
        progress: number;
        attentionAvg: number;
        attentionLast: number;
        attentionUpdatedAt: string;
        currentLesson: string;
        nextLesson: string;
        count: number;
      }
    > = {};
    const lessonsByCourse: Record<string, LessonItem[]> = {};
    lessons.forEach((lesson) => {
      const key = String(lesson.courseId || "0");
      if (!lessonsByCourse[key]) lessonsByCourse[key] = [];
      lessonsByCourse[key].push(lesson);
    });
    Object.values(lessonsByCourse).forEach((list) =>
      list.sort((a, b) => (a.moduleOrder - b.moduleOrder) || (a.order - b.order))
    );
    filteredEnrollments.forEach((enrollment) => {
      const course = enrollment.course || {};
      const courseId = course.id || null;
      const key = String(courseId || course.title || enrollment.id);
      const data = enrollment.enrollment_data || {};
      if (!byCourse[key]) {
        byCourse[key] = {
          id: courseId,
          name: course.title || "Curso",
          progress: 0,
          attentionAvg: 0,
          attentionLast: 0,
          attentionUpdatedAt: "",
          currentLesson: "",
          nextLesson: "",
          count: 0,
        };
      }
      if (data.progress_percent !== undefined) {
        byCourse[key].progress = Math.max(byCourse[key].progress, Number(data.progress_percent) || 0);
      }
      if (data.attention_avg !== undefined) {
        byCourse[key].attentionAvg = Math.max(byCourse[key].attentionAvg, Number(data.attention_avg) || 0);
      }
      if (data.attention_last !== undefined) {
        byCourse[key].attentionLast = Math.max(byCourse[key].attentionLast, Number(data.attention_last) || 0);
      }
      if (data.attention_updated_at) {
        byCourse[key].attentionUpdatedAt = data.attention_updated_at;
      }
      const lessonList = lessonsByCourse[String(courseId || "0")] || [];
      const lastLessonId = data.last_lesson_id;
      const lastIndex = lessonList.findIndex((l) => l.id === lastLessonId);
      const currentLesson = lastIndex >= 0 ? lessonList[lastIndex]?.title : lessonList[0]?.title;
      const nextLesson = lastIndex >= 0 ? lessonList[lastIndex + 1]?.title : lessonList[1]?.title;
      byCourse[key].currentLesson = currentLesson || "";
      byCourse[key].nextLesson = nextLesson || "";
    });
    filteredSessions.forEach((s) => {
      const name = s.course?.title || "Curso";
      const key = String(s.course?.id || name);
      if (!byCourse[key]) {
        byCourse[key] = {
          id: s.course?.id || null,
          name,
          progress: 0,
          attentionAvg: 0,
          attentionLast: 0,
          attentionUpdatedAt: "",
          currentLesson: "",
          nextLesson: "",
          count: 0,
        };
      }
      if (byCourse[key].attentionAvg === 0) {
        byCourse[key].attentionAvg += (s.mean_attention || 0) * 100;
        byCourse[key].count += 1;
      }
    });
    return Object.values(byCourse).map((c) => ({
      id: c.id,
      name: c.name,
      progress: c.progress,
      attentionAvg: c.count ? Math.round(c.attentionAvg / c.count) : Math.round(c.attentionAvg || 0),
      attentionLast: Math.round(c.attentionLast || 0),
      attentionUpdatedAt: c.attentionUpdatedAt,
      currentLesson: c.currentLesson,
      nextLesson: c.nextLesson,
    }));
  }, [filteredSessions, filteredEnrollments, lessons]);

  const hasBaseline = d2rResults.length > 0;

  const handleFinalizeCourse = async (enrollment: EnrollmentItem) => {
    if (!token) return;
    const data = enrollment.enrollment_data || {};
    const nextData = {
      ...data,
      progress_percent: 100,
      completed_lessons: data.total_lessons || data.completed_lessons || 0,
      updated_at: new Date().toISOString(),
    };
    try {
      await apiFetch(
        `/api/enrollments/${enrollment.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "completed", enrollment_data: nextData }),
        },
        token
      );
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollment.id ? { ...e, status: "completed", enrollment_data: nextData } : e))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRepeatCourse = async (enrollment: EnrollmentItem) => {
    if (!token) return;
    const data = enrollment.enrollment_data || {};
    const nextData = {
      ...data,
      last_lesson_id: null,
      completed_lessons: 0,
      progress_percent: 0,
      attention_avg: 0,
      attention_last: 0,
      attention_frames: 0,
      updated_at: new Date().toISOString(),
    };
    try {
      await apiFetch(
        `/api/enrollments/${enrollment.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "active", enrollment_data: nextData }),
        },
        token
      );
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollment.id ? { ...e, status: "active", enrollment_data: nextData } : e))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const attentionTrend = useMemo(() => {
    const byDate: Record<string, { total: number; count: number }> = {};
    filteredSessions.forEach((s) => {
      const dateKey = s.created_at ? new Date(s.created_at).toLocaleDateString() : `Sesion ${s.id}`;
      if (!byDate[dateKey]) byDate[dateKey] = { total: 0, count: 0 };
      byDate[dateKey].total += (s.mean_attention || 0) * 100;
      byDate[dateKey].count += 1;
    });
    return Object.entries(byDate)
      .map(([date, data]) => ({
        week: date,
        attention: data.count ? Math.round(data.total / data.count) : 0,
      }))
      .slice(-8);
  }, [filteredSessions]);

  const baselineHistory = useMemo(() => {
    return [...d2rResults]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 2)
      .map((r) => ({
        test: `D2R #${r.id}`,
        score: Math.round(r.raw_score || 0),
        avgAttention: Math.round(r.attention_span || 0),
        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      }));
  }, [d2rResults]);

  const categoryDistribution = courseProgress.length
    ? courseProgress.map((c) => ({ name: c.name, value: Math.max(5, Math.min(60, c.progress)) }))
    : [
        { name: "Programacion", value: 45 },
        { name: "IA/ML", value: 30 },
        { name: "Diseno", value: 25 },
      ];

  const weeklyStudyTime = useMemo(
    () => [
      { day: "Lun", hours: 2.5 },
      { day: "Mar", hours: 3.2 },
      { day: "Mie", hours: 1.8 },
      { day: "Jue", hours: 2.9 },
      { day: "Vie", hours: 2.1 },
      { day: "Sab", hours: 0 },
      { day: "Dom", hours: 0 },
    ],
    []
  );

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#06b6d4"];

  const suggestions = [
    {
      icon: Lightbulb,
      title: "Ajusta sesiones cortas",
      description: "Prueba bloques de 20 minutos y pausas breves para mantener la atencion estable.",
      action: "Ver recomendaciones",
    },
    {
      icon: Target,
      title: "Revisa tu linea base D2R",
      description: "Compara tu resultado D2R con tus cursos activos para detectar mejoras.",
      action: "Ver detalle",
    },
    {
      icon: Award,
      title: "Refuerza cursos con baja atencion",
      description: "Identifica cursos con menor atencion y repasa materiales clave.",
      action: "Abrir curso",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Estadisticas</h1>
        <p className="text-gray-600">Analisis detallado de tu rendimiento y atencion</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {loading && <p className="text-sm text-slate-500 mt-2">Cargando datos...</p>}
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{attentionAverage}%</div>
          <div className="text-sm text-gray-600">Atencion promedio por cursos</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{latestBaseline?.attention ?? 0}%</div>
          <div className="text-sm text-gray-600">Linea base D2R (ultimo)</div>
          <div className="text-xs text-slate-500 mt-1">Promedio historico: {baselineAttention}%</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{filteredEnrollments.length || 0}</div>
          <div className="text-sm text-gray-600">Cursos inscritos</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{lowAttentionRatio}%</div>
          <div className="text-sm text-gray-600">Ratio de baja atencion</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-xl mb-6">Tiempo de estudio semanal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyStudyTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-xl mb-6">Tendencia de atencion</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={attentionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="attention" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: "#8b5cf6", r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-6">Progreso por curso</h3>
          <div className="space-y-6">
          {courseProgress.length === 0 && (
            <p className="text-sm text-slate-500">Aun no hay sesiones asociadas a cursos.</p>
          )}
          {courseProgress.map((course, index) => (
              <div key={`${course.name}-${index}`} className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="mb-1">{course.name}</div>
                    <div className="text-sm text-gray-600">
                      Atencion promedio: {course.attentionAvg}% · Ultima: {course.attentionLast || 0}%
                    </div>
                    {course.attentionUpdatedAt && (
                      <div className="text-xs text-slate-500">
                        Actualizado: {new Date(course.attentionUpdatedAt).toLocaleString()}
                      </div>
                    )}
                    <div className="text-sm text-slate-600 mt-2">
                      Leccion actual: {course.currentLesson || "Sin registro"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Siguiente leccion: {course.nextLesson || "Sin registro"}
                    </div>
                  </div>
                  <div className="text-blue-600">{course.progress}%</div>
                </div>
                <Progress value={course.progress} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {hasBaseline && (
                    <button
                      className="text-xs rounded-lg px-3 py-2 bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => {
                        const enrollment = enrollments.find((e) => e.course?.id === course.id);
                        if (enrollment) handleFinalizeCourse(enrollment);
                      }}
                      disabled={!enrollments.find((e) => e.course?.id === course.id)}
                    >
                      Finalizar curso
                    </button>
                  )}
                  <button
                    className="text-xs rounded-lg px-3 py-2 border border-slate-200 hover:bg-white"
                    onClick={() => {
                      const enrollment = enrollments.find((e) => e.course?.id === course.id);
                      if (enrollment) handleRepeatCourse(enrollment);
                    }}
                    disabled={!enrollments.find((e) => e.course?.id === course.id)}
                  >
                    Repetir curso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-xl mb-6">Distribucion por categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {categoryDistribution.map((cat, index) => (
              <div key={`${cat.name}-${index}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span>{cat.name}</span>
                </div>
                <span className="text-gray-600">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <h3 className="text-xl mb-6">Resultados D2R (linea base)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Evaluacion</th>
                <th className="text-left py-3 px-4">Calificacion</th>
                <th className="text-left py-3 px-4">Atencion promedio</th>
                <th className="text-left py-3 px-4">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {baselineHistory.length === 0 ? (
                <tr>
                  <td className="py-4 px-4 text-gray-500" colSpan={4}>
                    Aun no hay resultados D2R registrados.
                  </td>
                </tr>
              ) : (
                baselineHistory.map((test, index) => (
                  <tr key={`${test.test}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">{test.test}</td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{test.score}%</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span>{test.avgAttention}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{test.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl mb-6">Recomendaciones personalizadas</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <div key={`${suggestion.title}-${index}`} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="mb-2">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{suggestion.description}</p>
                <button className="text-sm text-blue-600 hover:underline">{suggestion.action} -&gt;</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
