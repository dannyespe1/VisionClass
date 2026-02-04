
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Award,
  Eye,
  Clock,
  BookOpen,
  Target,
  Lightbulb,
  Calendar,
  Star,
  Brain,
  Zap,
  Settings,
  Shield,
  Trophy,
  FileText,
  BarChart3,
  Activity,
  Sun,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from "recharts";
import { apiFetch, BACKEND_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type AcademicMetrics = {
  gpa: number;
  courses_completed: number;
  total_courses: number;
  study_hours_week: number;
  study_hours_total: number;
  average_grade: number;
  certificates_earned: number;
};

type D2RAnalysis = {
  baseline_score: number;
  current_score: number;
  trend: string;
  last_test_date: string;
  next_scheduled: string;
  historical_average: number;
  percentile: number;
};

type AttentionTrend = {
  label: string;
  attention: number;
  performance: number;
};

type ContentEffectiveness = {
  type: string;
  attention: number;
  retention: number;
  preference: number;
};

type ProductivityBucket = {
  hour: string;
  productivity: number;
  sessions: number;
};

type CourseBreakdown = {
  id: number | null;
  name: string;
  progress: number;
  grade: number;
  attention_avg: number;
  study_hours: number;
  strengths: string[];
  improvements: string[];
  last_activity: string;
  next_milestone: string;
};

type Achievement = {
  id: number;
  title: string;
  description: string;
  progress: number;
  goal: number;
  unlocked: boolean;
  icon: string;
  color: string;
};

type Recommendation = {
  type: string;
  title: string;
  description: string;
  action: string;
  priority: string;
};

type StudentMetrics = {
  academic_metrics: AcademicMetrics;
  d2r_analysis: D2RAnalysis;
  attention_trend: AttentionTrend[];
  content_effectiveness: ContentEffectiveness[];
  productivity_by_hour: ProductivityBucket[];
  course_breakdown: CourseBreakdown[];
  achievements: Achievement[];
  recommendations: Recommendation[];
};

export function EstadisticasSection() {
  const { token } = useAuth();
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const payload = await apiFetch<StudentMetrics>("/api/student-metrics/", {}, token);
        setMetrics(payload);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar las estadisticas";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);
  const academicMetrics = metrics.academic_metrics  {
    gpa: 0,
    courses_completed: 0,
    total_courses: 0,
    study_hours_week: 0,
    study_hours_total: 0,
    average_grade: 0,
    certificates_earned: 0,
  };

  const d2rAnalysis = metrics.d2r_analysis  {
    baseline_score: 0,
    current_score: 0,
    trend: "0%",
    last_test_date: "",
    next_scheduled: "",
    historical_average: 0,
    percentile: 0,
  };

  const attentionTrend = useMemo(
    () =>
      (metrics.attention_trend || []).map((item) => ({
        month: item.label,
        attention: item.attention,
        performance: item.performance,
      })),
    [metrics]
  );

  const contentEffectiveness = metrics.content_effectiveness || [];
  const productivityByHour = metrics.productivity_by_hour || [];
  const courseBreakdown = metrics.course_breakdown || [];
  const achievements = metrics.achievements || [];
  const recommendations = metrics.recommendations || [];
  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#06b6d4"];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50";
      case "medium":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "border-blue-500 bg-blue-50";
    }
  };

  const getAchievementColor = (color: string) => {
    switch (color) {
      case "purple":
        return "bg-purple-100 text-purple-600";
      case "yellow":
        return "bg-yellow-100 text-yellow-600";
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "green":
        return "bg-green-100 text-green-600";
      case "orange":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const categoryDistribution = courseBreakdown.length
     courseBreakdown.map((c) => ({
        name: c.name,
        value: Math.max(5, Math.min(60, Math.round(c.progress))),
      }))
    : [
        { name: "Programacion", value: 45 },
        { name: "IA/ML", value: 30 },
        { name: "Diseno", value: 25 },
      ];

  const lastTestLabel = d2rAnalysis.last_test_date
     new Date(d2rAnalysis.last_test_date).toLocaleDateString()
    : "Sin registro";
  const nextScheduledLabel = d2rAnalysis.next_scheduled
     new Date(d2rAnalysis.next_scheduled).toLocaleDateString()
    : "--";

  const achievementIconMap: Record<string, typeof Brain> = {
    brain: Brain,
    zap: Zap,
    target: Target,
    calendar: Calendar,
    trophy: Trophy,
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    const authToken =
      token || (typeof window !== "undefined"  localStorage.getItem("jwt_token") : null);
    if (!authToken) {
      setError("Inicia sesión nuevamente para exportar el reporte.");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/student-metrics/export=${format}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte_estudiante.${format === "xlsx" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSchedule = async () => {
    if (!token || !scheduleDate) return;
    setScheduleMessage(null);
    try {
      await apiFetch(
        "/api/d2r-schedules/",
        {
          method: "POST",
          body: JSON.stringify({ scheduled_for: new Date(scheduleDate).toISOString() }),
        },
        token
      );
      setScheduleMessage("Test D2R programado correctamente.");
      setScheduleOpen(false);
    } catch (err) {
      setScheduleMessage("No se pudo programar el test.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Dashboard de Rendimiento</h1>
          <p className="text-gray-600">Análisis integral de métricas academicas y atención</p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {loading && <p className="text-sm text-slate-500 mt-2">Cargando estadisticas...</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen((prev) => !prev)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                  onClick={() => {
                    handleExport("pdf");
                    setExportOpen(false);
                  }}
                >
                  Descargar PDF
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                  onClick={() => {
                    handleExport("xlsx");
                    setExportOpen(false);
                  }}
                >
                  Descargar Excel
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Programar Test D2R
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrivacySettings(!showPrivacySettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>
      {showPrivacySettings && (
        <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border-2 border-blue-500">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg mb-2">Configuración de Privacidad y Preferencias</h3>
              <p className="text-sm text-gray-600 mb-6">
                Controla que datos se recopilan y como se utilizan en tu experiencia de aprendizaje
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="mb-1">Análisis de Atención en Tiempo Real</div>
                    <p className="text-sm text-gray-600">
                      Permite el monitoreo de concentración durante las sesiones
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="mb-1">Compartir Estadisticas con Profesores</div>
                    <p className="text-sm text-gray-600">
                      Los instructores veran tus métricas agregadas para mejor apoyo
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="mb-1">Recomendaciones Personalizadas</div>
                    <p className="text-sm text-gray-600">
                      Recibe sugerencias basadas en tus patrones de estudio
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="mb-1">Recordatorios de Tests D2R</div>
                    <p className="text-sm text-gray-600">
                      Notificaciones para actualizar tu perfil atencional
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowPrivacySettings(false)}>Guardar Configuración</Button>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg mb-2">Programar Test D2R</h3>
            <p className="text-sm text-slate-600 mb-4">
              Selecciona la fecha y hora para tu proxima evaluación.
            </p>
            <input
              type="datetime-local"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-4"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
            {scheduleMessage && <p className="text-sm text-emerald-600 mb-3">{scheduleMessage}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSchedule} disabled={!scheduleDate}>
                Programar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="attention">Análisis D2R</TabsTrigger>
          <TabsTrigger value="courses">Por Curso</TabsTrigger>
          <TabsTrigger value="achievements">Logros</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl mb-1">{academicMetrics.gpa}</div>
              <div className="text-sm text-gray-600">Promedio General (GPA)</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">
                  {academicMetrics.courses_completed}/{academicMetrics.total_courses}
                </span>
              </div>
              <div className="text-3xl mb-1">{academicMetrics.courses_completed}</div>
              <div className="text-sm text-gray-600">Cursos Completados</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-gray-600">Esta semana</span>
              </div>
              <div className="text-3xl mb-1">{academicMetrics.study_hours_week}h</div>
              <div className="text-sm text-gray-600">Tiempo de Estudio</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl mb-1">{academicMetrics.average_grade}</div>
              <div className="text-sm text-gray-600">Calificacion Promedio</div>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Evolución de Atención y Rendimiento
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={attentionTrend}>
                  <defs>
                    <linearGradient id="colorAttention" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="attention"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorAttention)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="performance"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorPerformance)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg mb-6 flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-600" />
                Horarios Mas Productivos
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productivityByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="productivity" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Efectividad por Tipo de Contenido
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={contentEffectiveness}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="type" stroke="#6b7280" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                <Radar
                  name="Atención"
                  dataKey="attention"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Retencion"
                  dataKey="retention"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Preferencia"
                  dataKey="preference"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Recomendaciones Personalizadas Basadas en IA
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.map((rec, index) => {
                const recommendationIconMap: Record<string, typeof Lightbulb> = {
                  "peak-time": Sun,
                  "content-preference": Activity,
                  improvement: AlertCircle,
                  achievement: Trophy,
                  general: Lightbulb,
                };
                const Icon = recommendationIconMap[rec.type] || Lightbulb;
                return (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${getPriorityColor(
                      rec.priority
                    )}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h4 className="mb-2">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                        <Button variant="link" className="p-0 h-auto text-sm">
                          {rec.action} -&gt;
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="attention" className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-purple-100">Puntuacion D2R</div>
                  <div className="text-3xl">{d2rAnalysis.current_score}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-100">Linea Base:</span>
                  <span>{d2rAnalysis.baseline_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-100">Mejora:</span>
                  <span className="text-green-200">{d2rAnalysis.trend}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-100">Percentil:</span>
                  <span>Top {100 - d2rAnalysis.percentile}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Ultimo Test D2R</div>
                  <div className="text-lg">{lastTestLabel}</div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-600 mb-2">Proximo programado:</div>
                <div className="text-sm">{nextScheduledLabel}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Promedio Historico</div>
                  <div className="text-3xl">{d2rAnalysis.historical_average}</div>
                </div>
              </div>
              <Progress value={(d2rAnalysis.current_score / 100) * 100} className="h-2" />
              <p className="text-xs text-gray-600 mt-2">Basado en evaluaciones registradas</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Interpretación de tu Perfil Atencional
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm mb-2 text-blue-900">Fortalezas Detectadas:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Alta capacidad de concentración sostenida</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Excelente atención selectiva en contenido visual</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Tendencia positiva en las ltimas sesiones</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm mb-2 text-blue-900">Oportunidades de Mejora:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Atención más baja en horarios nocturnos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Atención fluctuante en contenido teórico denso</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          {courseBreakdown.map((course, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl mb-2">{course.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Ultima actividad: {course.last_activity}</span>
                    <span></span>
                    <span>{course.study_hours}h de estudio</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl text-blue-600 mb-1">{course.grade}%</div>
                  <div className="text-sm text-gray-600">Calificacion</div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-600">Progreso del Curso</span>
                    <span className="text-blue-600">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-600">Atención Promedio</span>
                    <span className="text-purple-600">{course.attention_avg}%</span>
                  </div>
                  <Progress value={course.attention_avg} className="[&>div]:bg-purple-600" />
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Proximo Hito</div>
                  <div className="text-sm">{course.next_milestone}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <h4 className="text-sm mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Fortalezas Identificadas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {course.strengths.map((strength, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-600" />
                    Areas de Mejora
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {course.improvements.map((improvement, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                      >
                        {improvement}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Sistema de Logros por Concentración</h2>
                <p className="text-yellow-100">
                  Has desbloqueado {achievements.filter((a) => a.unlocked).length} de {achievements.length} logros
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => {
              const Icon = achievementIconMap[achievement.icon] || Trophy;
              const isUnlocked = achievement.unlocked;
              return (
                <div
                  key={achievement.id}
                  className={`bg-white rounded-xl p-6 shadow-sm ${
                    isUnlocked ? "border-2 border-yellow-400" : "opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 ${getAchievementColor(
                        achievement.color
                      )} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    {isUnlocked && <CheckCircle2 className="w-6 h-6 text-yellow-500" />}
                  </div>
                  <h4 className="mb-2">{achievement.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progreso</span>
                      <span className="text-blue-600">
                        {achievement.progress}/{achievement.goal}
                      </span>
                    </div>
                    <Progress value={(achievement.progress / achievement.goal) * 100} />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
