"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Eye, TrendingUp, BookOpen } from "lucide-react";
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
  user: { id: number; username: string; first_name: string; last_name: string };
  enrollment_data: {
    attention_avg: number;
    attention_last: number;
    progress: number;
    last_attention_at: string;
  };
};

type Session = {
  id: number;
  created_at: string;
  mean_attention: number;
  last_score: number;
  attention_score: number;
};

type QuizAttempt = {
  id: number;
  score: number;
  session: { course: { id: number } };
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

const avg = (values: number[]) => {
  if (!values.length) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
};

const normalizeNumber = (value: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
};

const formatWeek = (date: Date) => {
  const week = Math.ceil((date.getDate() + 6 - date.getDay()) / 7);
  return `S${week}`;
};

export function EstadisticasProfesor() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [courseData, enrollmentData, sessionData, quizData] = await Promise.all([
          apiFetch<any[]>("/api/courses/", {}, token),
          apiFetch<any[]>("/api/enrollments/", {}, token),
          apiFetch<any[]>("/api/sessions/", {}, token),
          apiFetch<any[]>("/api/quiz-attempts/", {}, token),
        ]);
        setCourses(
          (courseData || []).filter(
            (course) => (course.title || "").toLowerCase() !== BASELINE_TITLE
          )
        );
        setEnrollments(enrollmentData || []);
        setSessions(sessionData || []);
        setQuizAttempts(quizData || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar las estadísticas";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const courseStats = useMemo(() => {
    return courses.map((course) => {
      const courseEnrollments = enrollments.filter((enroll) => enroll.course.id === course.id);
      const attentionValues = courseEnrollments.map((enroll) =>
        normalizeNumber(
          enroll.enrollment_data.attention_avg ??
            enroll.enrollment_data.attention_last
        )
      );
      const completionValues = courseEnrollments.map((enroll) =>
        normalizeNumber(enroll.enrollment_data.progress)
      );
      const courseQuizScores = quizAttempts
        .filter((attempt) => attempt.session.course.id === course.id)
        .map((attempt) => normalizeNumber(attempt.score));
      return {
        course: course.title,
        students: courseEnrollments.length,
        avgAttention: avg(attentionValues),
        completion: avg(completionValues),
        avgGrade: avg(courseQuizScores) || 0,
      };
    });
  }, [courses, enrollments, quizAttempts]);

  const overallStats = useMemo(() => {
    const attentionValues = enrollments.map((enroll) =>
      normalizeNumber(
        enroll.enrollment_data.attention_avg ??
          enroll.enrollment_data.attention_last
      )
    );
    const completionValues = enrollments.map((enroll) =>
      normalizeNumber(enroll.enrollment_data.progress)
    );
    const gradeValues = quizAttempts.map((attempt) => normalizeNumber(attempt.score));
    return {
      students: enrollments.length,
      avgAttention: avg(attentionValues),
      avgCompletion: avg(completionValues),
      avgGrade: avg(gradeValues),
    };
  }, [enrollments, quizAttempts]);

  const attentionTrend = useMemo(() => {
    const grouped = new Map<string, number[]>();
    sessions.forEach((session) => {
      if (!session.created_at) return;
      const value = normalizeNumber(
        session.mean_attention ??
          session.attention_score ??
          session.last_score
      );
      if (!value) return;
      const date = new Date(session.created_at);
      const key = formatWeek(date);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(value);
    });
    if (!grouped.size) {
      enrollments.forEach((enroll) => {
        const timestamp =
          enroll.enrollment_data.attention_updated_at ||
          enroll.enrollment_data.last_attention_at ||
          enroll.enrollment_data.last_update_at;
        if (!timestamp) return;
        const value = normalizeNumber(
          enroll.enrollment_data.attention_avg ??
            enroll.enrollment_data.attention_last
        );
        if (!value) return;
        const date = new Date(timestamp);
        const key = formatWeek(date);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(value);
      });
    }
    return Array.from(grouped.entries())
      .map(([week, values]) => ({
        week,
        attention: avg(values),
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [sessions, enrollments]);

  const attentionDistribution = useMemo(() => {
    const buckets = { excelente: 0, bueno: 0, regular: 0, bajo: 0 };
      enrollments.forEach((enroll) => {
      const value = normalizeNumber(
        enroll.enrollment_data.attention_avg ??
          enroll.enrollment_data.attention_last
      );
      if (!value) return;
      if (value >= 90) buckets.excelente += 1;
      else if (value >= 80) buckets.bueno += 1;
      else if (value >= 70) buckets.regular += 1;
      else buckets.bajo += 1;
    });
    return [
      { name: "Excelente (90-100)", value: buckets.excelente },
      { name: "Bueno (80-89)", value: buckets.bueno },
      { name: "Regular (70-79)", value: buckets.regular },
      { name: "Necesita Apoyo (<70)", value: buckets.bajo },
    ];
  }, [enrollments]);

  const attentionByCourse = useMemo(() => {
    return courseStats.map((course) => ({
      course: course.course,
      attention: course.avgAttention,
    }));
  }, [courseStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Estadísticas del profesor</h1>
        <p className="text-gray-600">
          Análisis del rendimiento y la atención basada en actividad real de los estudiantes.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{overallStats.students}</div>
          <div className="text-sm text-gray-600">Estudiantes totales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{overallStats.avgAttention}%</div>
          <div className="text-sm text-gray-600">Atención promedio</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{overallStats.avgCompletion}%</div>
          <div className="text-sm text-gray-600">Progreso promedio</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{overallStats.avgGrade || "--"}</div>
          <div className="text-sm text-gray-600">Calificación promedio</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl">Rendimiento por curso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6">Curso</th>
                <th className="text-left py-4 px-6">Estudiantes</th>
                <th className="text-left py-4 px-6">Atención prom.</th>
                <th className="text-left py-4 px-6">Progreso</th>
                <th className="text-left py-4 px-6">Calificacion</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.map((stat, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">{stat.course}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      {stat.students}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          stat.avgAttention >= 80
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {stat.avgAttention}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">{stat.completion}%</td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {stat.avgGrade || "--"}
                    </span>
                  </td>
                </tr>
              ))}
              {!courseStats.length && !loading && (
                <tr>
                  <td className="py-6 px-6 text-sm text-gray-500" colSpan={5}>
                    No hay cursos con estudiantes inscritos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-6">Tendencia semanal de atención</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={attentionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="attention" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          {!attentionTrend.length && (
            <p className="text-sm text-gray-500 mt-4">Aún no hay sesiones para graficar tendencia.</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-6">Distribución de estudiantes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={attentionDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label
              >
                {attentionDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {attentionDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-xl mb-6">Atención promedio por curso</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={attentionByCourse}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="course" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Bar dataKey="attention" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {!attentionByCourse.length && (
          <p className="text-sm text-gray-500 mt-4">No hay cursos para graficar atención.</p>
        )}
      </div>
    </div>
  );
}
