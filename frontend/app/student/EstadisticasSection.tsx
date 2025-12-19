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

export function EstadisticasSection() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [d2rResults, setD2RResults] = useState<D2RItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [sess, d2r] = await Promise.all([
          apiFetch<SessionItem[]>("/api/sessions/", {}, token),
          apiFetch<D2RItem[]>("/api/d2r-results/", {}, token),
        ]);
        setSessions(sess || []);
        setD2RResults(d2r || []);
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
    const byCourse: Record<string, { name: string; progress: number; attentionAvg: number; count: number }> = {};
    filteredSessions.forEach((s) => {
      const name = s.course?.title || "Curso";
      const key = String(s.course?.id || name);
      if (!byCourse[key]) {
        byCourse[key] = { name, progress: 0, attentionAvg: 0, count: 0 };
      }
      byCourse[key].attentionAvg += (s.mean_attention || 0) * 100;
      byCourse[key].count += 1;
    });
    return Object.values(byCourse).map((c) => ({
      name: c.name,
      progress: 100,
      attentionAvg: c.count ? Math.round(c.attentionAvg / c.count) : 0,
    }));
  }, [filteredSessions]);

  const attentionTrend = useMemo(() => {
    return filteredSessions
      .map((s) => ({
        week: s.created_at ? new Date(s.created_at).toLocaleDateString() : `Sesion ${s.id}`,
        attention: Math.round((s.mean_attention || 0) * 100),
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
          <div className="text-2xl mb-1">{courseProgress.length || 0}</div>
          <div className="text-sm text-gray-600">Cursos con sesion activa</div>
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
              <div key={`${course.name}-${index}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="mb-1">{course.name}</div>
                    <div className="text-sm text-gray-600">Atencion promedio: {course.attentionAvg}%</div>
                  </div>
                  <div className="text-blue-600">{course.progress}%</div>
                </div>
                <Progress value={course.progress} />
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
