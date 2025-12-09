import {
  TrendingUp,
  Award,
  Eye,
  Clock,
  BookOpen,
  Target,
  Lightbulb,
} from "lucide-react";
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

export function EstadisticasSection() {
  const courseProgress = [
    { name: "Python", progress: 65, attentionAvg: 85 },
    { name: "ML Basico", progress: 42, attentionAvg: 78 },
    { name: "UX/UI", progress: 88, attentionAvg: 92 },
  ];

  const weeklyStudyTime = [
    { day: "Lun", hours: 2.5 },
    { day: "Mar", hours: 3.2 },
    { day: "Mie", hours: 1.8 },
    { day: "Jue", hours: 2.9 },
    { day: "Vie", hours: 2.1 },
    { day: "Sab", hours: 0 },
    { day: "Dom", hours: 0 },
  ];

  const attentionTrend = [
    { week: "S1", attention: 72 },
    { week: "S2", attention: 75 },
    { week: "S3", attention: 78 },
    { week: "S4", attention: 82 },
    { week: "S5", attention: 85 },
  ];

  const testResults = [
    {
      course: "Introduccion a Python",
      test: "Evaluacion Modulo 3",
      score: 92,
      avgAttention: 88,
      date: "15 Nov 2024",
    },
    {
      course: "Machine Learning Basico",
      test: "Quiz: Regresion",
      score: 85,
      avgAttention: 76,
      date: "12 Nov 2024",
    },
    {
      course: "Diseno UX/UI",
      test: "Proyecto Final",
      score: 95,
      avgAttention: 94,
      date: "10 Nov 2024",
    },
  ];

  const categoryDistribution = [
    { name: "Programacion", value: 45 },
    { name: "IA/ML", value: 30 },
    { name: "Diseno", value: 25 },
  ];

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981"];

  const suggestions = [
    {
      icon: Lightbulb,
      title: "Mejora tu concentracion en ML",
      description:
        "Tu nivel de atencion en Machine Learning es del 78%. Prueba sesiones mas cortas y con pausas.",
      action: "Ver recomendaciones",
    },
    {
      icon: Target,
      title: "Casi terminas UX/UI",
      description: "Estas al 88% de completar Diseno UX/UI. Solo faltan 2 lecciones.",
      action: "Continuar curso",
    },
    {
      icon: Award,
      title: "Curso recomendado: React Avanzado",
      description: "Basado en tu progreso en Python, este curso puede interesarte.",
      action: "Ver curso",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Estadisticas</h1>
        <p className="text-gray-600">Analisis detallado de tu rendimiento y atencion</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">85%</div>
          <div className="text-sm text-gray-600">Atencion promedio</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">65%</div>
          <div className="text-sm text-gray-600">Progreso general</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Esta semana</span>
          </div>
          <div className="text-2xl mb-1">12.5h</div>
          <div className="text-sm text-gray-600">Tiempo de estudio</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 transition transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">90.7</div>
          <div className="text-sm text-gray-600">Calificacion promedio</div>
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
            {courseProgress.map((course, index) => (
              <div key={index}>
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
              <div key={index} className="flex items-center justify-between text-sm">
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
        <h3 className="text-xl mb-6">Resumen de evaluaciones</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Curso</th>
                <th className="text-left py-3 px-4">Evaluacion</th>
                <th className="text-left py-3 px-4">Calificacion</th>
                <th className="text-left py-3 px-4">Atencion promedio</th>
                <th className="text-left py-3 px-4">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {testResults.map((test, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">{test.course}</td>
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
              ))}
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
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="mb-2">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{suggestion.description}</p>
                <button className="text-sm text-blue-600 hover:underline">{suggestion.action} →</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
