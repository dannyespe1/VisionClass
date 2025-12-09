import { useState } from "react";
import {
  Users,
  Eye,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Brain,
  Target,
  Zap,
  AlertCircle,
  CheckCircle2,
  UserX,
  Settings,
  BarChart3,
  LineChart as LineChartIcon,
  Filter,
  Download,
  Send,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Progress } from "../../ui/progress";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
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
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from "recharts";

export function EstadisticasProfesorAdvanced() {
  const [selectedCourse, setSelectedCourse] = useState("python");
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Analytics avanzados por estudiante
  const studentAnalytics = [
    {
      id: 1,
      name: "María García",
      email: "maria.garcia@estudiante.edu",
      d2rScore: 92,
      d2rTrend: "+5%",
      avgGrade: 95,
      attentionAvg: 90,
      completionRate: 100,
      studyHours: 42,
      riskLevel: "low",
      lastActivity: "Hace 2 horas",
      strengths: ["Ejercicios prácticos", "Videos educativos"],
      weaknesses: [],
    },
    {
      id: 2,
      name: "Carlos Rodríguez",
      email: "carlos.rodriguez@estudiante.edu",
      d2rScore: 75,
      d2rTrend: "-8%",
      avgGrade: 72,
      attentionAvg: 68,
      completionRate: 75,
      studyHours: 18,
      riskLevel: "high",
      lastActivity: "Hace 3 días",
      strengths: ["Evaluaciones cortas"],
      weaknesses: ["Contenido denso", "Sesiones largas"],
    },
    {
      id: 3,
      name: "Ana Martínez",
      email: "ana.martinez@estudiante.edu",
      d2rScore: 88,
      d2rTrend: "+2%",
      avgGrade: 90,
      attentionAvg: 85,
      completionRate: 95,
      studyHours: 38,
      riskLevel: "low",
      lastActivity: "Hace 1 día",
      strengths: ["Lecturas PDF", "Ejercicios prácticos"],
      weaknesses: ["Videos largos"],
    },
    {
      id: 4,
      name: "Pedro López",
      email: "pedro.lopez@estudiante.edu",
      d2rScore: 70,
      d2rTrend: "-12%",
      avgGrade: 68,
      attentionAvg: 62,
      completionRate: 60,
      studyHours: 15,
      riskLevel: "critical",
      lastActivity: "Hace 5 días",
      strengths: ["Videos cortos"],
      weaknesses: ["PDFs extensos", "Ejercicios complejos"],
    },
    {
      id: 5,
      name: "Laura Sánchez",
      email: "laura.sanchez@estudiante.edu",
      d2rScore: 85,
      d2rTrend: "0%",
      avgGrade: 88,
      attentionAvg: 82,
      completionRate: 90,
      studyHours: 35,
      riskLevel: "medium",
      lastActivity: "Hace 6 horas",
      strengths: ["Ejercicios prácticos", "Evaluaciones"],
      weaknesses: ["Contenido teórico denso"],
    },
  ];

  // Correlación D2R vs Rendimiento
  const correlationData = studentAnalytics.map(student => ({
    name: student.name.split(' ')[0],
    d2rScore: student.d2rScore,
    grade: student.avgGrade,
    attention: student.attentionAvg,
  }));

  // Engagement por tipo de contenido
  const contentEngagement = [
    { type: "Videos Cortos (<10min)", attention: 92, completion: 95, avgGrade: 88 },
    { type: "Videos Largos (>20min)", attention: 75, completion: 70, avgGrade: 82 },
    { type: "PDFs Interactivos", attention: 85, completion: 88, avgGrade: 90 },
    { type: "PDFs Extensos", attention: 68, completion: 65, avgGrade: 78 },
    { type: "Ejercicios Prácticos", attention: 95, completion: 92, avgGrade: 93 },
    { type: "Evaluaciones", attention: 90, completion: 98, avgGrade: 85 },
  ];

  // Alertas tempranas
  const earlyWarnings = [
    {
      type: "critical",
      icon: AlertTriangle,
      student: "Pedro López",
      issue: "Riesgo Alto de Deserción",
      details: "D2R bajó 12% + Inactividad 5 días + Calificaciones <70%",
      action: "Contacto urgente recomendado",
      priority: 1,
    },
    {
      type: "warning",
      icon: AlertCircle,
      student: "Carlos Rodríguez",
      issue: "Disminución en Atención",
      details: "D2R bajó 8% en 2 semanas + Sesiones de estudio irregulares",
      action: "Intervención temprana sugerida",
      priority: 2,
    },
    {
      type: "info",
      icon: Eye,
      student: "Laura Sánchez",
      issue: "Atención Baja en PDFs",
      details: "Atención 35% menor en contenido escrito vs videos",
      action: "Recomendar formato alternativo",
      priority: 3,
    },
  ];

  // Recomendaciones IA para optimizar contenido
  const aiRecommendations = [
    {
      icon: Zap,
      type: "content-optimization",
      title: "Dividir Lección 5 en Módulos Más Cortos",
      description: "El análisis de atención muestra que los estudiantes pierden concentración después de 15 minutos en esta lección. Sugerimos dividirla en 3 módulos de 8-10 minutos.",
      impact: "Alto",
      metrics: "Atención estimada: 72% → 88%",
      action: "Ver propuesta de reestructuración",
    },
    {
      icon: Target,
      type: "assessment-timing",
      title: "Momento Óptimo para Evaluación del Módulo 3",
      description: "Los niveles de atención grupal están en pico (promedio 90%). La ventana óptima es en los próximos 2-3 días basado en patrones históricos.",
      impact: "Medio",
      metrics: "Rendimiento proyectado: +12%",
      action: "Programar evaluación",
    },
    {
      icon: Lightbulb,
      type: "content-addition",
      title: "Agregar Ejercicios Prácticos a Lección 7",
      description: "Los estudiantes muestran 95% de atención en ejercicios vs 70% en teoría pura. Agregar ejercicios intercalados podría mejorar retención.",
      impact: "Alto",
      metrics: "Retención estimada: +18%",
      action: "Ver ejemplos sugeridos",
    },
    {
      icon: BookOpen,
      type: "material-alternative",
      title: "Ofrecer Formato Alternativo para PDF Módulo 4",
      description: "40% de estudiantes muestra baja atención en PDFs extensos. IA ha generado un resumen interactivo y formato de flashcards.",
      impact: "Medio",
      metrics: "Engagement estimado: +25%",
      action: "Revisar material generado",
    },
  ];

  // Módulo IA: Evaluaciones adaptativas
  const adaptiveAssessments = [
    {
      student: "María García",
      d2rLevel: "Alto (92)",
      recommendedType: "Prueba Desafiante",
      difficulty: "Avanzado",
      suggestedQuestions: [
        "Análisis de casos complejos",
        "Problemas de aplicación múltiple",
        "Preguntas de pensamiento crítico",
      ],
      estimatedPerformance: "95%",
    },
    {
      student: "Pedro López",
      d2rLevel: "Bajo (70)",
      recommendedType: "Evaluación de Refuerzo",
      difficulty: "Fundamental",
      suggestedQuestions: [
        "Conceptos básicos revisados",
        "Ejercicios guiados paso a paso",
        "Preguntas de opción múltiple con retroalimentación",
      ],
      estimatedPerformance: "78%",
    },
    {
      student: "Ana Martínez",
      d2rLevel: "Alto (88)",
      recommendedType: "Prueba Balanceada",
      difficulty: "Intermedio-Avanzado",
      suggestedQuestions: [
        "Mezcla de teoría y práctica",
        "Casos de estudio moderados",
        "Preguntas de desarrollo",
      ],
      estimatedPerformance: "92%",
    },
  ];

  // Patrones de atención por hora del día (agregado)
  const attentionByTime = [
    { hour: "8-10am", avgAttention: 82, sessions: 45 },
    { hour: "10-12pm", avgAttention: 90, sessions: 120 },
    { hour: "12-2pm", avgAttention: 68, sessions: 35 },
    { hour: "2-4pm", avgAttention: 78, sessions: 85 },
    { hour: "4-6pm", avgAttention: 85, sessions: 95 },
    { hour: "6-8pm", avgAttention: 88, sessions: 110 },
    { hour: "8-10pm", avgAttention: 75, sessions: 60 },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-100 text-red-700 border-red-300";
      case "high": return "bg-orange-100 text-orange-700 border-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default: return "bg-green-100 text-green-700 border-green-300";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical": return <Badge variant="destructive">Crítico</Badge>;
      case "high": return <Badge className="bg-orange-500">Alto</Badge>;
      case "medium": return <Badge className="bg-yellow-500">Medio</Badge>;
      default: return <Badge className="bg-green-500">Bajo</Badge>;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "Alto": return "text-green-600";
      case "Medio": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Analytics Avanzados</h1>
          <p className="text-gray-600">
            Monitoreo de atención y rendimiento con IA predictiva
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Introducción a Python</SelectItem>
              <SelectItem value="ml">Machine Learning</SelectItem>
              <SelectItem value="data">Estructuras de Datos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="students">Por Estudiante</TabsTrigger>
          <TabsTrigger value="content">Optimización de Contenido</TabsTrigger>
          <TabsTrigger value="adaptive">IA Adaptativa</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-8">
          {/* Alertas Tempranas */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Alertas Tempranas - Estudiantes en Riesgo
              </h2>
              <Badge variant="destructive">{earlyWarnings.length} alertas activas</Badge>
            </div>
            <div className="space-y-4">
              {earlyWarnings.map((warning, index) => {
                const Icon = warning.icon;
                const borderColor = warning.type === "critical" ? "border-red-500" : warning.type === "warning" ? "border-orange-500" : "border-blue-500";
                const bgColor = warning.type === "critical" ? "bg-red-50" : warning.type === "warning" ? "bg-orange-50" : "bg-blue-50";
                return (
                  <div key={index} className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${borderColor}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg">{warning.student}</h3>
                          <span className="text-xs text-gray-600">Prioridad {warning.priority}</span>
                        </div>
                        <div className="mb-2">{warning.issue}</div>
                        <p className="text-sm text-gray-600 mb-3">{warning.details}</p>
                        <div className="flex items-center gap-3">
                          <Button size="sm">
                            <Send className="w-3 h-3 mr-2" />
                            {warning.action}
                          </Button>
                          <Button variant="outline" size="sm">Ver Historial</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Correlación D2R vs Rendimiento */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Correlación entre Métricas D2R y Rendimiento Académico
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" dataKey="d2rScore" name="Puntuación D2R" unit="%" stroke="#6b7280" />
                <YAxis type="number" dataKey="grade" name="Calificación" unit="%" stroke="#6b7280" />
                <ZAxis type="number" dataKey="attention" range={[100, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Estudiantes" data={correlationData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Correlación positiva detectada: r = 0.87 (Fuerte relación entre D2R y rendimiento)
            </p>
          </div>

          {/* Engagement por tipo de contenido */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Engagement Detectado por Tipo de Contenido
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={contentEngagement} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="type" type="category" width={150} stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="attention" fill="#8b5cf6" name="Atención %" radius={[0, 8, 8, 0]} />
                <Bar dataKey="completion" fill="#3b82f6" name="Completación %" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Patrones de atención por hora */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-green-600" />
              Horarios de Mayor Atención Grupal
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attentionByTime}>
                <defs>
                  <linearGradient id="colorAttentionTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" stroke="#6b7280" />
                <YAxis stroke="#6b7280" domain={[60, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="avgAttention" stroke="#10b981" fillOpacity={1} fill="url(#colorAttentionTime)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Insight:</strong> El pico de atención es entre 10-12pm (90% promedio). Considera programar contenido complejo o evaluaciones en este horario.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Por Estudiante */}
        <TabsContent value="students" className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Análisis Individual de Estudiantes</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar por Riesgo
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

                  <div className="grid md:grid-cols-5 gap-4 mb-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">D2R Score</div>
                      <div className="text-xl text-purple-600">{student.d2rScore}</div>
                      <div className={`text-xs ${student.d2rTrend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {student.d2rTrend}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Calificación</div>
                      <div className="text-xl text-blue-600">{student.avgGrade}%</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Atención</div>
                      <div className="text-xl text-green-600">{student.attentionAvg}%</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Completación</div>
                      <div className="text-xl text-orange-600">{student.completionRate}%</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Horas</div>
                      <div className="text-xl text-indigo-600">{student.studyHours}h</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Fortalezas
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {student.strengths.map((strength, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-600" />
                        Áreas de Oportunidad
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {student.weaknesses.length > 0 ? (
                          student.weaknesses.map((weakness, i) => (
                            <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                              {weakness}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">Ninguna identificada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="outline">Ver Perfil Completo</Button>
                    <Button size="sm" variant="outline">Enviar Mensaje</Button>
                    {(student.riskLevel === "high" || student.riskLevel === "critical") && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        Programar Tutoría
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Optimización de Contenido */}
        <TabsContent value="content" className="space-y-6">
          <div>
            <h2 className="text-xl mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Recomendaciones de IA para Optimizar Materiales
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {aiRecommendations.map((rec, index) => {
                const Icon = rec.icon;
                return (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-purple-500">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg">{rec.title}</h3>
                          <Badge className={getImpactColor(rec.impact)}>{rec.impact}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                        <p className="text-sm text-blue-600 mb-4">{rec.metrics}</p>
                        <Button size="sm" variant="outline">{rec.action} →</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Tab: IA Adaptativa */}
        <TabsContent value="adaptive" className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Módulo de IA: Evaluaciones Adaptativas</h2>
                <p className="text-indigo-100">
                  Genera automáticamente evaluaciones personalizadas basadas en niveles de atención D2R de cada estudiante
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg">Evaluaciones Sugeridas por Estudiante</h3>
              <p className="text-sm text-gray-600 mt-1">
                Basado en análisis de atención y rendimiento histórico
              </p>
            </div>

            <div className="divide-y">
              {adaptiveAssessments.map((assessment, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="mb-1">{assessment.student}</h4>
                      <p className="text-sm text-gray-600">Nivel D2R: {assessment.d2rLevel}</p>
                    </div>
                    <Badge className="bg-indigo-500">{assessment.difficulty}</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm mb-3">
                        <strong>Tipo Recomendado:</strong> {assessment.recommendedType}
                      </div>
                      <div className="text-sm mb-2 text-gray-600">Preguntas Sugeridas:</div>
                      <ul className="space-y-2">
                        {assessment.suggestedQuestions.map((q, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-600 mb-1">Rendimiento Estimado</div>
                        <div className="text-3xl text-indigo-600 mb-2">{assessment.estimatedPerformance}</div>
                        <Progress value={parseInt(assessment.estimatedPerformance)} className="h-2" />
                      </div>
                      <Button size="sm" className="w-full">
                        Generar Evaluación con IA
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
