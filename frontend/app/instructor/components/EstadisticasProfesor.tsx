import { Users, Eye, TrendingUp, AlertTriangle, Lightbulb, BookOpen } from "lucide-react";
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

export function EstadisticasProfesor() {
  const courseStats = [
    {
      course: "Python",
      students: 45,
      avgAttention: 85,
      completion: 72,
      avgGrade: 88,
    },
    {
      course: "ML Básico",
      students: 32,
      avgAttention: 78,
      completion: 65,
      avgGrade: 82,
    },
    {
      course: "Est. Datos",
      students: 38,
      avgAttention: 82,
      completion: 58,
      avgGrade: 85,
    },
  ];

  const attentionTrend = [
    { week: "S1", python: 80, ml: 75, estructuras: 78 },
    { week: "S2", python: 82, ml: 76, estructuras: 80 },
    { week: "S3", python: 84, ml: 77, estructuras: 81 },
    { week: "S4", python: 85, ml: 78, estructuras: 82 },
  ];

  const lessonsAttention = [
    { lesson: "L1", attention: 88 },
    { lesson: "L2", attention: 85 },
    { lesson: "L3", attention: 72 },
    { lesson: "L4", attention: 90 },
    { lesson: "L5", attention: 78 },
    { lesson: "L6", attention: 86 },
  ];

  const studentDistribution = [
    { name: "Excelente (90-100)", value: 35 },
    { name: "Bueno (80-89)", value: 40 },
    { name: "Regular (70-79)", value: 20 },
    { name: "Necesita Apoyo (<70)", value: 5 },
  ];

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  const suggestions = [
    {
      icon: AlertTriangle,
      type: "warning",
      title: "Atención baja en Lección 3",
      description:
        "La lección sobre 'Estructuras de Control' tiene un promedio de atención del 72%. Considera dividirla en sesiones más cortas o agregar elementos interactivos.",
      course: "Introducción a Python",
    },
    {
      icon: Lightbulb,
      type: "tip",
      title: "Momento ideal para evaluación",
      description:
        "El nivel de atención de los estudiantes está en su punto más alto (90%). Es un buen momento para aplicar una evaluación del módulo actual.",
      course: "Machine Learning Básico",
    },
    {
      icon: TrendingUp,
      type: "success",
      title: "Mejora en participación",
      description:
        "La atención promedio ha aumentado un 12% en las últimas 3 semanas. Los estudiantes están más comprometidos con el material.",
      course: "Estructuras de Datos",
    },
    {
      icon: Users,
      type: "info",
      title: "Estudiantes en riesgo",
      description:
        "5 estudiantes (11%) muestran niveles de atención consistentemente bajos. Considera una sesión de tutoría personalizada.",
      course: "Introducción a Python",
    },
  ];

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "tip":
        return "bg-blue-50 border-blue-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "info":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSuggestionIconColor = (type: string) => {
    switch (type) {
      case "warning":
        return "text-yellow-600";
      case "tip":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "info":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Estadísticas del Profesor</h1>
        <p className="text-gray-600">
          Análisis del rendimiento y atención de tus estudiantes
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">115</div>
          <div className="text-sm text-gray-600">Estudiantes Totales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">82%</div>
          <div className="text-sm text-gray-600">Atención Promedio</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">65%</div>
          <div className="text-sm text-gray-600">Progreso Promedio</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">85</div>
          <div className="text-sm text-gray-600">Calificación Promedio</div>
        </div>
      </div>

      {/* Course Performance Table */}
      <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl">Rendimiento por Curso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6">Curso</th>
                <th className="text-left py-4 px-6">Estudiantes</th>
                <th className="text-left py-4 px-6">Atención Prom.</th>
                <th className="text-left py-4 px-6">Completado</th>
                <th className="text-left py-4 px-6">Calificación</th>
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
                      {stat.avgGrade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Attention Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-6">Tendencia de Atención por Curso</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={attentionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="python"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Python"
              />
              <Line
                type="monotone"
                dataKey="ml"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="ML"
              />
              <Line
                type="monotone"
                dataKey="estructuras"
                stroke="#10b981"
                strokeWidth={2}
                name="Est. Datos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Student Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-6">Distribución de Estudiantes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={studentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label
              >
                {studentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {studentDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                ></div>
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attention by Lesson */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <h3 className="text-xl mb-6">Atención por Lección (Python)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={lessonsAttention}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="lesson" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Bar dataKey="attention" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Suggestions Section */}
      <div>
        <h3 className="text-xl mb-6">Sugerencias y Recomendaciones</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <div
                key={index}
                className={`rounded-xl p-6 border-2 ${getSuggestionColor(suggestion.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      suggestion.type === "warning"
                        ? "bg-yellow-100"
                        : suggestion.type === "tip"
                        ? "bg-blue-100"
                        : suggestion.type === "success"
                        ? "bg-green-100"
                        : "bg-purple-100"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${getSuggestionIconColor(suggestion.type)}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-2">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                    <div className="text-sm text-gray-500">
                      Curso: <span className="text-gray-900">{suggestion.course}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
