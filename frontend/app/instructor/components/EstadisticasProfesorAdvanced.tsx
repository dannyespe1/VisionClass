"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Eye,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Filter,
  Send,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const BASELINE_TITLE = "baseline d2r";

type Course = {
  id: number;
  title: string;
};

type Enrollment = {
  id: number;
  course?: { id: number; title: string };
  user?: {
    id: number;
    username: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  enrollment_data?: {
    attention_avg?: number;
    attention_last?: number;
    progress?: number;
    last_attention_at?: string;
  };
};

type D2RResult = {
  id: number;
  user?: { id: number };
  attention_span?: number;
  created_at?: string;
};

type QuizAttempt = {
  id: number;
  user?: { id: number };
  score?: number;
};

const normalizeNumber = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
};

const avg = (values: number[]) => {
  if (!values.length) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
};

const formatName = (user?: Enrollment["user"]) => {
  if (!user) return "Estudiante";
  const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return full || user.username || "Estudiante";
};

const getRiskLevel = (attention: number, progress: number) => {
  if (attention < 60 || progress < 40) return "critical";
  if (attention < 70 || progress < 60) return "high";
  if (attention < 80 || progress < 75) return "medium";
  return "low";
};

export function EstadisticasProfesorAdvanced() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [d2rResults, setD2rResults] = useState<D2RResult[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [courseData, enrollmentData, d2rData] = await Promise.all([
          apiFetch<any[]>("/api/courses/", {}, token),
          apiFetch<any[]>("/api/enrollments/", {}, token),
          apiFetch<any[]>("/api/d2r-results/", {}, token),
        ]);
        const quizData = await apiFetch<any[]>("/api/quiz-attempts/", {}, token);
        const validCourses = (courseData || []).filter(
          (course) => (course.title || "").toLowerCase() !== BASELINE_TITLE
        );
        setCourses(validCourses);
        setEnrollments(enrollmentData || []);
        setD2rResults(d2rData || []);
        setQuizAttempts(quizData || []);
        if (validCourses.length && !selectedCourseId) {
          setSelectedCourseId(String(validCourses[0].id));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar las estadisticas";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, selectedCourseId]);

  const d2rByUser = useMemo(() => {
    const map = new Map<number, { score: number; created_at?: string }>();
    d2rResults.forEach((result) => {
      const userId = result.user?.id;
      if (!userId) return;
      const score = normalizeNumber(result.attention_span);
      const current = map.get(userId);
      if (!current || (result.created_at && current.created_at && result.created_at > current.created_at)) {
        map.set(userId, { score, created_at: result.created_at });
      } else if (!current) {
        map.set(userId, { score, created_at: result.created_at });
      }
    });
    return map;
  }, [d2rResults]);

  const studentAnalytics = useMemo(() => {
    const courseId = Number(selectedCourseId);
    return enrollments
      .filter((enroll) => enroll.course?.id === courseId)
      .map((enroll) => {
        const attention = normalizeNumber(
          enroll.enrollment_data?.attention_avg ?? enroll.enrollment_data?.attention_last
        );
        const progress = normalizeNumber(enroll.enrollment_data?.progress);
        const d2rScore = d2rByUser.get(enroll.user?.id || 0)?.score ?? 0;
        const avgGrade = avg(
          quizAttempts
            .filter((attempt) => attempt.user?.id === enroll.user?.id)
            .map((attempt) => normalizeNumber(attempt.score))
        );
        const riskLevel = getRiskLevel(attention, progress);
        return {
          id: enroll.id,
          name: formatName(enroll.user),
          email: enroll.user?.email || "--",
          d2rScore,
          avgGrade,
          attentionAvg: attention,
          completionRate: progress,
          riskLevel,
          lastActivity: enroll.enrollment_data?.last_attention_at || "Sin actividad",
        };
      });
  }, [enrollments, selectedCourseId, d2rByUser, quizAttempts]);

  const earlyWarnings = useMemo(() => {
    return studentAnalytics
      .filter((student) => student.riskLevel === "critical" || student.riskLevel === "high")
      .map((student, index) => ({
        id: `${student.id}-${index}`,
        type: student.riskLevel === "critical" ? "critical" : "warning",
        student: student.name,
        issue:
          student.riskLevel === "critical"
            ? "Riesgo alto de desconexion"
            : "Disminucion en atencion",
        details: `Atencion ${student.attentionAvg}% y avance ${student.completionRate}%`,
        action: "Contactar estudiante",
      }));
  }, [studentAnalytics]);

  const correlationData = useMemo(() => {
    return studentAnalytics.map((student) => ({
      name: student.name.split(" ")[0],
      d2rScore: student.d2rScore,
      grade: student.avgGrade,
      attention: student.attentionAvg,
    }));
  }, [studentAnalytics]);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return <Badge variant="destructive">Critico</Badge>;
      case "high":
        return <Badge className="bg-orange-500">Alto</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medio</Badge>;
      default:
        return <Badge className="bg-green-500">Bajo</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Analytics avanzados</h1>
          <p className="text-gray-600">
            Seguimiento de estudiantes basado en progreso y atencion real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona un curso" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="students">Por estudiante</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Alertas tempranas
              </h2>
              <Badge variant="destructive">{earlyWarnings.length} alertas activas</Badge>
            </div>
            <div className="space-y-4">
              {earlyWarnings.map((warning) => (
                <div
                  key={warning.id}
                  className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${
                    warning.type === "critical" ? "border-red-500" : "border-orange-500"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        warning.type === "critical" ? "bg-red-50" : "bg-orange-50"
                      }`}
                    >
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg">{warning.student}</h3>
                      </div>
                      <div className="mb-2">{warning.issue}</div>
                      <p className="text-sm text-gray-600 mb-3">{warning.details}</p>
                      <div className="flex items-center gap-3">
                        <Button size="sm">
                          <Send className="w-3 h-3 mr-2" />
                          {warning.action}
                        </Button>
                        <Button variant="outline" size="sm">
                          Ver historial
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!earlyWarnings.length && !loading && (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600">
                  No hay alertas activas para este curso.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Correlacion entre D2R y progreso
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" dataKey="d2rScore" name="D2R" unit="%" stroke="#6b7280" />
                <YAxis type="number" dataKey="grade" name="Progreso" unit="%" stroke="#6b7280" />
                <ZAxis type="number" dataKey="attention" range={[100, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Estudiantes" data={correlationData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
            {!correlationData.length && (
              <p className="text-sm text-gray-500 mt-4">No hay datos suficientes para graficar.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Analisis individual de estudiantes</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                </div>
              </div>
            </div>

            <div className="divide-y">
              {studentAnalytics.map((student) => (
                <div key={student.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{student.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="mb-1">{student.name}</h4>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-xs text-gray-500 mt-1">{student.lastActivity}</p>
                      </div>
                    </div>
                    {getRiskBadge(student.riskLevel)}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">D2R</div>
                      <div className="text-xl text-purple-600">{student.d2rScore}%</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Atencion</div>
                      <div className="text-xl text-green-600">{student.attentionAvg}%</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Progreso</div>
                      <div className="text-xl text-orange-600">{student.completionRate}%</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Calificacion</div>
                      <div className="text-xl text-blue-600">{student.avgGrade}%</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Ver perfil
                    </Button>
                    <Button size="sm" variant="outline">
                      Enviar mensaje
                    </Button>
                    {(student.riskLevel === "high" || student.riskLevel === "critical") && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        Programar tutoria
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!studentAnalytics.length && !loading && (
                <div className="p-6 text-sm text-gray-500">
                  No hay estudiantes inscritos en este curso.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
