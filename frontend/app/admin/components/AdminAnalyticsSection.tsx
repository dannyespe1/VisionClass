"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Download,
  Eye,
  GraduationCap,
  Settings,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Progress } from "../../ui/progress";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type {
  AdminAnalyticsData,
  DropoutCase,
  PrivacyPolicySetting,
  ResearchPermission,
} from "../types";

type Props = {
  data: AdminAnalyticsData;
  onUpdatePolicy: (id: number, value: string) => void;
  onUpdateResearchStatus: (id: number, status: ResearchPermission["status"]) => void;
};

export function AdminAnalyticsSection({ data, onUpdatePolicy, onUpdateResearchStatus }: Props) {
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [policyValues, setPolicyValues] = useState<Record<number, string>>({});

  const facultyMetrics = data.faculty_metrics || [];
  const dropoutPrediction = data.dropout_prediction || [];
  const institutionalTrend = data.institutional_trend || [];
  const researchPermissions = data.research_permissions || [];
  const privacyPolicies = data.privacy_policies || [];

  const filteredFaculty = useMemo(() => {
    if (selectedFaculty === "all") return facultyMetrics;
    return facultyMetrics.filter((faculty) => faculty.name.toLowerCase() === selectedFaculty);
  }, [facultyMetrics, selectedFaculty]);

  const getRiskStyles = (level: DropoutCase["riskLevel"]) => {
    if (level === "critical") {
      return { border: "border-red-500", pill: "bg-red-100 text-red-700" };
    }
    if (level === "high") {
      return { border: "border-orange-500", pill: "bg-orange-100 text-orange-700" };
    }
    return { border: "border-yellow-500", pill: "bg-yellow-100 text-yellow-700" };
  };

  const getStatusBadge = (status: ResearchPermission["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Aprobado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pendiente</Badge>;
      default:
        return <Badge variant="destructive">Rechazado</Badge>;
    }
  };

  const handlePolicyChange = (policy: PrivacyPolicySetting, value: string) => {
    setPolicyValues((prev) => ({ ...prev, [policy.id]: value }));
  };

  const resolvePolicyValue = (policy: PrivacyPolicySetting) =>
    policyValues[policy.id]  policy.current_value;

  return (
    <section className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Análisis Institucional</h1>
          <p className="text-slate-600">Métricas agregadas, análisis predictivo y gestion de privacidad</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte Institucional
        </Button>
      </div>

      <Tabs defaultValue="metrics" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="metrics">Métricas por Facultad</TabsTrigger>
          <TabsTrigger value="prediction">Análisis Predictivo</TabsTrigger>
          <TabsTrigger value="research">Permisos de Investigacion</TabsTrigger>
          <TabsTrigger value="privacy">Politicas de Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid md:grid-cols-4 gap-6 w-full">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.reduce((sum, item) => sum + item.students, 0)}
                </div>
                <div className="text-sm text-slate-600">Estudiantes Totales</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.reduce((sum, item) => sum + item.professors, 0)}
                </div>
                <div className="text-sm text-slate-600">Profesores Activos</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.length
                     Math.round(
                        facultyMetrics.reduce((sum, item) => sum + item.avgAttention, 0) /
                          facultyMetrics.length
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-slate-600">Atención Promedio</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.length
                     Math.round(
                        facultyMetrics.reduce((sum, item) => sum + item.dropoutRisk, 0) / facultyMetrics.length
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-slate-600">Riesgo de Desercion</div>
              </div>
            </div>

            <div className="w-full md:max-w-xs">
              <div className="text-xs text-slate-500 mb-2">Filtrar por facultad</div>
              <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las facultades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {facultyMetrics.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.name.toLowerCase()}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg">Comparativa por Facultad</h3>
            </div>
            <div className="divide-y">
              {filteredFaculty.map((faculty) => (
                <div key={faculty.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="mb-1">{faculty.name}</h4>
                        <p className="text-sm text-slate-600">
                          {faculty.students} estudiantes  {faculty.professors} profesores  {faculty.courses} cursos
                        </p>
                      </div>
                    </div>
                    <Badge className={faculty.trend.startsWith("+") ? "bg-green-500" : "bg-red-500"}>
                      {faculty.trend}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Atención Promedio</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-purple-600">{faculty.avgAttention}%</div>
                      </div>
                      <Progress value={faculty.avgAttention} className="h-2 mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Calificacion Promedio</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-blue-600">{faculty.avgGrade}%</div>
                      </div>
                      <Progress value={faculty.avgGrade} className="h-2 mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Tasa de Completacion</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-green-600">{faculty.completionRate}%</div>
                      </div>
                      <Progress value={faculty.completionRate} className="h-2 mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Riesgo de Desercion</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-red-600">{faculty.dropoutRisk}%</div>
                      </div>
                      <Progress value={faculty.dropoutRisk} className="h-2 mt-2 [&>div]:bg-red-500" />
                    </div>
                  </div>
                </div>
              ))}
              {filteredFaculty.length === 0 && (
                <div className="p-6 text-sm text-slate-500">No hay datos para la facultad seleccionada.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6">Evolución Institucional</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={institutionalTrend}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAttentionInst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis yAxisId="left" stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="students"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorStudents)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="attention"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorAttentionInst)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="prediction" className="space-y-6">
          <div className="bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Análisis Predictivo de Desercion Estudiantil</h2>
                <p className="text-red-100">
                  IA identifica estudiantes en riesgo basándose en métricas de atención, asistencia y rendimiento
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="text-3xl text-red-600 mb-1">
                {dropoutPrediction.filter((item) => item.riskLevel === "critical").length}
              </div>
              <div className="text-sm text-slate-600 mb-3">Estudiantes en Riesgo Critico</div>
              <Button size="sm" variant="destructive" className="w-full">
                Ver Lista Completa
              </Button>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl text-orange-600 mb-1">
                {dropoutPrediction.filter((item) => item.riskLevel === "high").length}
              </div>
              <div className="text-sm text-slate-600 mb-3">Riesgo Alto</div>
              <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600">
                Ver Lista Completa
              </Button>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="text-3xl text-yellow-600 mb-1">
                {dropoutPrediction.filter((item) => item.riskLevel === "medium").length}
              </div>
              <div className="text-sm text-slate-600 mb-3">Riesgo Medio</div>
              <Button size="sm" variant="outline" className="w-full">
                Ver Lista Completa
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg mb-6">Casos Prioritarios - Intervencion Recomendada</h3>
            <div className="space-y-4">
              {dropoutPrediction.map((caseItem) => {
                const styles = getRiskStyles(caseItem.riskLevel);
                return (
                  <div
                    key={caseItem.id}
                    className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${styles.border}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg mb-1">{caseItem.student}</h4>
                        <p className="text-sm text-slate-600">{caseItem.faculty}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-red-600 mb-1">{caseItem.riskScore}%</div>
                        <div className="text-xs text-slate-600">Riesgo</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm mb-2">Factores de Riesgo Detectados:</div>
                      <ul className="space-y-2">
                        {caseItem.factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="text-sm mb-1">
                        <strong>Recomendacion Automatica:</strong>
                      </div>
                      <p className="text-sm text-blue-800">{caseItem.recommendation}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm">Asignar a Tutor</Button>
                      <Button size="sm" variant="outline">
                        Programar Reunion
                      </Button>
                      <Button size="sm" variant="outline">
                        Ver Perfil Completo
                      </Button>
                    </div>
                  </div>
                );
              })}
              {dropoutPrediction.length === 0 && (
                <div className="bg-white rounded-xl p-6 text-sm text-slate-500">
                  No hay estudiantes en riesgo con los criterios actuales.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="research" className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg mb-1">Solicitudes de Acceso a Datos</h3>
                  <p className="text-sm text-slate-600">
                    Gestion de permisos para proyectos de investigacion
                  </p>
                </div>
                <Badge className="bg-blue-500">{researchPermissions.length} solicitudes</Badge>
              </div>
            </div>

            <div className="divide-y">
              {researchPermissions.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="mb-1">{request.project}</h4>
                      <p className="text-sm text-slate-600 mb-2">
                        {request.researcher} - {request.institution}
                      </p>
                      <p className="text-xs text-slate-500">
                        Solicitado: {request.date || request.requested_at || "Sin fecha"}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm mb-1 text-slate-600">Datos Solicitados:</div>
                      <div className="text-sm">{request.data_requested}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm mb-1 text-slate-600">Aprobacion Etica:</div>
                      <div className="flex items-center gap-2">
                        {request.ethics_approval ? (
                          <>
                            <Badge className="bg-green-500">Aprobado</Badge>
                            <span className="text-sm">Comite de Etica</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="destructive">Pendiente</Badge>
                            <span className="text-sm">Sin aprobacion</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => onUpdateResearchStatus(request.id, "approved")}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onUpdateResearchStatus(request.id, "rejected")}>
                        Rechazar
                      </Button>
                      <Button size="sm" variant="outline">
                        Solicitar Mas Informacion
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {researchPermissions.length === 0 && (
                <div className="p-6 text-sm text-slate-500">No hay solicitudes de investigacion.</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Configuración de Politicas de Privacidad</h2>
                <p className="text-blue-100">
                  Gestiona la privacidad de datos a nivel institucional segun regulaciones y buenas practicas
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {privacyPolicies.map((policy) => (
              <div key={policy.id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="mb-2">{policy.name}</h4>
                    <p className="text-sm text-slate-600">{policy.description}</p>
                  </div>
                  <Settings className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" />
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-slate-600 mb-2">Configuración Actual:</div>
                    <Select value={resolvePolicyValue(policy)} onValueChange={(value) => handlePolicyChange(policy, value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {policy.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" className="md:mb-1" onClick={() => onUpdatePolicy(policy.id, resolvePolicyValue(policy))}>
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            ))}
            {privacyPolicies.length === 0 && (
              <div className="bg-white rounded-xl p-6 text-sm text-slate-500">
                No hay politicas configuradas.
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="mb-1 text-yellow-900">Aviso Importante</div>
                <p className="text-sm text-yellow-800">
                  Los cambios en las politicas de privacidad afectan a todos los usuarios. Asegura el
                  cumplimiento de regulaciones locales (GDPR, CCPA) y consulta al area legal antes de
                  modificar configuraciones criticas.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
