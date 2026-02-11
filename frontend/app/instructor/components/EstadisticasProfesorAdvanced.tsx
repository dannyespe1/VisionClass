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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
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
  course: { id: number; title: string };
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  enrollment_data: {
    attention_avg: number;
    attention_last: number;
    progress: number;
    last_attention_at: string;
  };
};

type MessageTargetInput = {
  userId: number;
  courseId: number;
  name: string;
  email: string;
  attentionAvg: number;
  completionRate: number;
  avgGrade: number;
};

type D2RResult = {
  id: number;
  user: { id: number };
  attention_span: number;
  created_at: string;
  raw_score?: number;
  processing_speed?: number;
  errors?: number;
  phase_data?: {
    totalPhases?: number;
    durationSeconds?: number;
    phases?: Array<{
      phase: number;
      start?: number;
      end?: number;
      summary?: {
        TR?: number;
        TA?: number;
        O?: number;
        C?: number;
        CON?: number;
        targetCount?: number;
      };
    }>;
  };
};

type QuizAttempt = {
  id: number;
  user: { id: number };
  score: number;
};

const normalizeNumber = (value: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
};

const avg = (values: number[]) => {
  if (!values.length) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
};

const formatName = (user: Enrollment["user"]) => {
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
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{
    userId: number;
    courseId: number;
    name: string;
    email: string;
    attentionAvg: number;
    completionRate: number;
    avgGrade: number;
  } | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageStatus, setMessageStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [d2rOpen, setD2rOpen] = useState(false);
  const [d2rTarget, setD2rTarget] = useState<{ name: string; result: D2RResult } | null>(null);

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

  const latestD2RByUser = useMemo(() => {
    const map = new Map<number, D2RResult>();
    d2rResults.forEach((result) => {
      const userId = result.user.id;
      if (!userId) return;
      const current = map.get(userId);
      if (!current) {
        map.set(userId, result);
        return;
      }
      if (result.created_at && current.created_at && result.created_at > current.created_at) {
        map.set(userId, result);
      }
    });
    return map;
  }, [d2rResults]);

  const d2rByUser = useMemo(() => {
    const map = new Map<number, { score: number; created_at: string }>();
    latestD2RByUser.forEach((result, userId) => {
      map.set(userId, {
        score: normalizeNumber(result.attention_span),
        created_at: result.created_at,
      });
    });
    return map;
  }, [latestD2RByUser]);

  const studentAnalytics = useMemo(() => {
    const courseId = Number(selectedCourseId);
    return enrollments
      .filter((enroll) => enroll.course.id === courseId)
      .map((enroll) => {
        const attention = normalizeNumber(
          enroll.enrollment_data.attention_avg ??
            enroll.enrollment_data.attention_last
        );
        const progress = normalizeNumber(enroll.enrollment_data.progress);
        const d2rScore = d2rByUser.get(enroll.user.id || 0)?.score ?? 0;
        const avgGrade = avg(
          quizAttempts
            .filter((attempt) => attempt.user.id === enroll.user.id)
            .map((attempt) => normalizeNumber(attempt.score))
        );
        const riskLevel = getRiskLevel(attention, progress);
        return {
          id: enroll.id,
          userId: enroll.user.id || 0,
          courseId: enroll.course.id || 0,
          name: formatName(enroll.user),
          email: enroll.user.email || "--",
          d2rScore,
          avgGrade,
          attentionAvg: attention,
          completionRate: progress,
          riskLevel,
          lastActivity: enroll.enrollment_data.last_attention_at || "Sin actividad",
        };
      });
  }, [enrollments, selectedCourseId, d2rByUser, quizAttempts]);

  const earlyWarnings = useMemo(() => {
    return studentAnalytics
      .filter((student) => student.riskLevel === "critical" || student.riskLevel === "high")
      .map((student, index) => ({
        id: `${student.id}-${index}`,
        userId: student.userId,
        courseId: student.courseId,
        email: student.email,
        type: student.riskLevel === "critical" ? "critical" : "warning",
        student: student.name,
        attentionAvg: student.attentionAvg,
        completionRate: student.completionRate,
        avgGrade: student.avgGrade,
        issue:
          student.riskLevel === "critical"
            ? "Riesgo alto de desconexión"
            : "Disminución en atención",
        details: `Atención ${student.attentionAvg}% y avance ${student.completionRate}%`,
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

  const openMessageModal = (student: MessageTargetInput) => {
    if (!student.userId || !student.courseId) return;
    setMessageTarget({
      userId: student.userId,
      courseId: student.courseId,
      name: student.name,
      email: student.email,
      attentionAvg: student.attentionAvg,
      completionRate: student.completionRate,
      avgGrade: student.avgGrade,
    });
    setMessageSubject("Alerta de rendimiento");
    setMessageBody(
      `Hola ${student.name},\n\n` +
        `Detectamos una disminución en tu rendimiento.\n` +
        `Atención promedio: ${student.attentionAvg}%\n` +
        `Progreso del curso: ${student.completionRate}%\n` +
        `Promedio de evaluaciones: ${student.avgGrade}%\n\n` +
        "Te recomendamos agendar una tutoría o comunicarte conmigo si necesitas apoyo.\n"
    );
    setMessageStatus(null);
    setMessageOpen(true);
  };

  const openD2RModal = (student: {
    userId: number;
    name: string;
  }) => {
    const result = latestD2RByUser.get(student.userId);
    if (!result) return;
    setD2rTarget({ name: student.name, result });
    setD2rOpen(true);
  };

  const d2rPhaseRows = useMemo(() => {
    const phases = d2rTarget?.result.phase_data?.phases || [];
    return phases
      .map((p) => ({
        phase: p.phase,
        TR: p.summary?.TR ?? 0,
        TA: p.summary?.TA ?? 0,
        O: p.summary?.O ?? 0,
        C: p.summary?.C ?? 0,
        CON: p.summary?.CON ?? 0,
      }))
      .sort((a, b) => a.phase - b.phase);
  }, [d2rTarget]);

  const d2rTotals = useMemo(() => {
    return d2rPhaseRows.reduce(
      (acc, row) => {
        acc.TR += row.TR;
        acc.TA += row.TA;
        acc.O += row.O;
        acc.C += row.C;
        acc.CON += row.CON;
        return acc;
      },
      { TR: 0, TA: 0, O: 0, C: 0, CON: 0 }
    );
  }, [d2rPhaseRows]);

  const sendNotification = async () => {
    if (!token || !messageTarget) return;
    if (!messageTarget.email || messageTarget.email === "--") {
      setMessageStatus({ type: "error", text: "El estudiante no tiene email registrado." });
      return;
    }
    try {
      await apiFetch(
        "/api/notifications/student/",
        {
          method: "POST",
          body: JSON.stringify({
            student_id: messageTarget.userId,
            course_id: messageTarget.courseId,
            subject: messageSubject,
            message: messageBody,
          }),
        },
        token
      );
      setMessageStatus({ type: "ok", text: "Notificación enviada correctamente." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo enviar la notificación.";
      setMessageStatus({ type: "error", text: msg });
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
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
            Seguimiento de estudiantes basado en progreso y atención real.
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
                        <Button
                          size="sm"
                          onClick={() =>
                            openMessageModal({
                              userId: warning.userId,
                              courseId: warning.courseId,
                              name: warning.student,
                              email: warning.email,
                              avgGrade: warning.avgGrade,
                              attentionAvg: warning.attentionAvg,
                              completionRate: warning.completionRate,
                            })
                          }
                        >
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
              Correlación entre D2R y progreso
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
                <h3 className="text-lg">Análisis individual de estudiantes</h3>
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
                      <div className="text-xs text-gray-600 mb-1">Atención</div>
                      <div className="text-xl text-green-600">{student.attentionAvg}%</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Progreso</div>
                      <div className="text-xl text-orange-600">{student.completionRate}%</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Calificacin</div>
                      <div className="text-xl text-blue-600">{student.avgGrade}%</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Ver perfil
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!latestD2RByUser.get(student.userId)}
                      onClick={() => openD2RModal({ userId: student.userId, name: student.name })}
                    >
                      Ver D2R
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openMessageModal(student)}>
                      Enviar mensaje
                    </Button>
                    {(student.riskLevel === "high" || student.riskLevel === "critical") && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        Programar tutora
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

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notificar estudiante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Destinatario</p>
              <p className="text-sm">
                {messageTarget?.name || "Estudiante"} {messageTarget?.email || ""}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Asunto</label>
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={messageSubject}
                onChange={(event) => setMessageSubject(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Mensaje</label>
              <textarea
                className="min-h-[140px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
              />
            </div>
            {messageStatus && (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  messageStatus.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {messageStatus.text}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={sendNotification}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={d2rOpen} onOpenChange={setD2rOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resultados D2R (último test)</DialogTitle>
          </DialogHeader>
          {d2rTarget ? (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs text-slate-500">Estudiante</div>
                  <div className="font-semibold text-slate-900">{d2rTarget.name}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs text-slate-500">Fecha</div>
                  <div className="font-semibold text-slate-900">
                    {d2rTarget.result.created_at
                      ? new Date(d2rTarget.result.created_at).toLocaleString()
                      : "--"}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs text-slate-500">CON (concentración)</div>
                  <div className="font-semibold text-slate-900">
                    {normalizeNumber(d2rTarget.result.attention_span)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Resumen por fase
                </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-white border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Fase</th>
                        <th className="px-3 py-2 text-center">TR</th>
                        <th className="px-3 py-2 text-center">TA</th>
                        <th className="px-3 py-2 text-center">O</th>
                        <th className="px-3 py-2 text-center">C</th>
                        <th className="px-3 py-2 text-center">CON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d2rPhaseRows.length ? (
                        d2rPhaseRows.map((row) => (
                          <tr key={`d2r-row-${row.phase}`} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-left font-semibold text-slate-700">{row.phase}</td>
                            <td className="px-3 py-2 text-center">{row.TR}</td>
                            <td className="px-3 py-2 text-center">{row.TA}</td>
                            <td className="px-3 py-2 text-center">{row.O}</td>
                            <td className="px-3 py-2 text-center">{row.C}</td>
                            <td className="px-3 py-2 text-center">{row.CON}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                            No hay datos de fases para este test.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {d2rPhaseRows.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                        <tr>
                          <td className="px-3 py-2 text-left">Total</td>
                          <td className="px-3 py-2 text-center">{d2rTotals.TR}</td>
                          <td className="px-3 py-2 text-center">{d2rTotals.TA}</td>
                          <td className="px-3 py-2 text-center">{d2rTotals.O}</td>
                          <td className="px-3 py-2 text-center">{d2rTotals.C}</td>
                          <td className="px-3 py-2 text-center">{d2rTotals.CON}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">No hay resultado D2R disponible.</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setD2rOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
