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

  const facultyMetrics = useMemo(() => data.faculty_metrics || [], [data.faculty_metrics]);
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
      return { border: "border-destructive", pill: "bg-destructive/10 text-destructive" };
    }
    if (level === "high") {
      return { border: "border-warning", pill: "bg-warning/10 text-warning" };
    }
    return { border: "border-warning", pill: "bg-warning/10 text-warning" };
  };

  const getStatusBadge = (status: ResearchPermission["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-[var(--success-foreground)]">Aprobado</Badge>;
      case "pending":
        return <Badge className="bg-warning text-[var(--warning-foreground)]">Pendiente</Badge>;
      default:
        return <Badge variant="destructive">Rechazado</Badge>;
    }
  };

  const handlePolicyChange = (policy: PrivacyPolicySetting, value: string) => {
    setPolicyValues((prev) => ({ ...prev, [policy.id]: value }));
  };

  const resolvePolicyValue = (policy: PrivacyPolicySetting) =>
    policyValues[policy.id] ?? policy.current_value;

  return (
    <section className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Análisis Institucional</h1>
          <p className="text-muted-foreground">Métricas agregadas, análisis predictivo y gestión de privacidad</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte Institucional
        </Button>
      </div>

      <Tabs defaultValue="metrics" className="space-y-8">
        <TabsList className="bg-card p-1 rounded-lg shadow-sm">
          <TabsTrigger value="metrics">Métricas por Categoría de curso</TabsTrigger>
          <TabsTrigger value="prediction">Análisis Predictivo</TabsTrigger>
          <TabsTrigger value="research">Permisos de Investigación</TabsTrigger>
          <TabsTrigger value="privacy">Políticas de Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid md:grid-cols-4 gap-6 w-full">
              <div className="bg-card rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.reduce((sum, item) => sum + item.students, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Suma de estudiantes por categoría</div>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-success" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.reduce((sum, item) => sum + item.professors, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Docentes con cursos activos</div>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.length ? Math.round(
                        facultyMetrics.reduce((sum, item) => sum + item.avgAttention, 0) /
                          facultyMetrics.length
                      ) : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Atención Promedio</div>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-3xl mb-1">
                  {facultyMetrics.length ? Math.round(
                        facultyMetrics.reduce((sum, item) => sum + item.dropoutRisk, 0) / facultyMetrics.length
                      ) : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Riesgo de Deserción</div>
              </div>
            </div>

            <div className="w-full md:max-w-xs">
              <div className="text-xs text-muted-foreground mb-2">Filtrar por categoría de curso</div>
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

          <div className="bg-card rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg">Comparativa por Categoría de curso</h3>
            </div>
            <div className="divide-y">
              {filteredFaculty.map((faculty) => (
                <div key={faculty.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="mb-1">{faculty.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {faculty.students} estudiantes  {faculty.professors} profesores  {faculty.courses} cursos
                        </p>
                      </div>
                    </div>
                    <Badge className={faculty.trend.startsWith("+") ? "bg-success text-[var(--success-foreground)]" : "bg-destructive text-destructive-foreground"}>
                      {faculty.trend}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Atención Promedio</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-primary">{faculty.avgAttention}%</div>
                      </div>
                      <Progress value={faculty.avgAttention} className="h-2 mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Calificación Promedio</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-primary">{faculty.avgGrade}%</div>
                      </div>
                      <Progress value={faculty.avgGrade} className="h-2 mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Tasa de Completación</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-success">{faculty.completionRate}%</div>
                      </div>
                      <Progress value={faculty.completionRate} className="h-2 mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Riesgo de Deserción</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl text-destructive">{faculty.dropoutRisk}%</div>
                      </div>
                      <Progress value={faculty.dropoutRisk} className="h-2 mt-2 [&>div]:bg-destructive" />
                    </div>
                  </div>
                </div>
              ))}
              {filteredFaculty.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">No hay datos para la categoría seleccionada.</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm">
            <h3 className="text-lg mb-6">Evolución Institucional</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={institutionalTrend}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAttentionInst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis yAxisId="left" stroke="var(--muted-foreground)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="students"
                  stroke="var(--primary)"
                  fillOpacity={1}
                  fill="url(#colorStudents)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="attention"
                  stroke="var(--secondary)"
                  fillOpacity={1}
                  fill="url(#colorAttentionInst)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="prediction" className="space-y-6">
          <div className="border border-destructive/20 bg-destructive/10 text-foreground rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-destructive/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Análisis Predictivo de Deserción Estudiantil</h2>
                <p className="text-muted-foreground">
                  IA identifica estudiantes en riesgo basándose en métricas de atención, asistencia y rendimiento
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <UserX className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="text-3xl text-destructive mb-1">
                {dropoutPrediction.filter((item) => item.riskLevel === "critical").length}
              </div>
              <div className="text-sm text-muted-foreground mb-3">Estudiantes en Riesgo Crítico</div>
              <Button size="sm" variant="destructive" className="w-full">
                Ver Lista Completa
              </Button>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="text-3xl text-warning mb-1">
                {dropoutPrediction.filter((item) => item.riskLevel === "high").length}
              </div>
              <div className="text-sm text-muted-foreground mb-3">Riesgo Alto</div>
              <Button size="sm" className="w-full bg-warning text-[var(--warning-foreground)] hover:bg-warning/90">
                Ver Lista Completa
              </Button>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="text-3xl text-warning mb-1">
                {dropoutPrediction.filter((item) => item.riskLevel === "medium").length}
              </div>
              <div className="text-sm text-muted-foreground mb-3">Riesgo Medio</div>
              <Button size="sm" variant="outline" className="w-full">
                Ver Lista Completa
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg mb-6">Casos Prioritarios - Intervención Recomendada</h3>
            <div className="space-y-4">
              {dropoutPrediction.map((caseItem) => {
                const styles = getRiskStyles(caseItem.riskLevel);
                return (
                  <div
                    key={caseItem.id}
                    className={`bg-card rounded-xl p-6 shadow-sm border-l-4 ${styles.border}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg mb-1">{caseItem.student}</h4>
                        <p className="text-sm text-muted-foreground">{caseItem.faculty}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-destructive mb-1">{caseItem.riskScore}%</div>
                        <div className="text-xs text-muted-foreground">Riesgo</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm mb-2">Factores de Riesgo Detectados:</div>
                      <ul className="space-y-2">
                        {caseItem.factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-primary/10 rounded-lg p-4 mb-4">
                      <div className="text-sm mb-1">
                        <strong>Recomendación Automática:</strong>
                      </div>
                      <p className="text-sm text-primary">{caseItem.recommendation}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm">Asignar a Tutor</Button>
                      <Button size="sm" variant="outline">
                        Programar Reunión
                      </Button>
                      <Button size="sm" variant="outline">
                        Ver Perfil Completo
                      </Button>
                    </div>
                  </div>
                );
              })}
              {dropoutPrediction.length === 0 && (
                <div className="bg-card rounded-xl p-6 text-sm text-muted-foreground">
                  No hay estudiantes en riesgo con los criterios actuales.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="research" className="space-y-6">
          <div className="bg-card rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg mb-1">Solicitudes de Acceso a Datos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gestión de permisos para proyectos de investigación
                  </p>
                </div>
                <Badge className="bg-primary">{researchPermissions.length} solicitudes</Badge>
              </div>
            </div>

            <div className="divide-y">
              {researchPermissions.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="mb-1">{request.project}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {request.researcher} - {request.institution}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado: {request.date || request.requested_at || "Sin fecha"}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm mb-1 text-muted-foreground">Datos Solicitados:</div>
                      <div className="text-sm">{request.data_requested}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm mb-1 text-muted-foreground">Aprobación Ética:</div>
                      <div className="flex items-center gap-2">
                        {request.ethics_approval ? (
                          <>
                            <Badge className="bg-success text-[var(--success-foreground)]">Aprobado</Badge>
                            <span className="text-sm">Comité de Ética</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="destructive">Pendiente</Badge>
                            <span className="text-sm">Sin aprobación</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" className="bg-success text-[var(--success-foreground)] hover:bg-success/90" onClick={() => onUpdateResearchStatus(request.id, "approved")}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onUpdateResearchStatus(request.id, "rejected")}>
                        Rechazar
                      </Button>
                      <Button size="sm" variant="outline">
                        Solicitar Más Información
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {researchPermissions.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">No hay solicitudes de investigación.</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <div className="bg-primary text-primary-foreground rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Configuración de Políticas de Privacidad</h2>
                <p className="text-primary-foreground/80">
                  Administra los parámetros institucionales de privacidad configurados en la plataforma
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {privacyPolicies.map((policy) => (
              <div key={policy.id} className="bg-card rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="mb-2">{policy.name}</h4>
                    <p className="text-sm text-muted-foreground">{policy.description}</p>
                  </div>
                  <Settings className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-4" />
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-2">Configuración Actual:</div>
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
              <div className="bg-card rounded-xl p-6 text-sm text-muted-foreground">
                No hay políticas configuradas.
              </div>
            )}
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <div className="mb-1 text-warning">Aviso Importante</div>
                <p className="text-sm text-warning">
                  Los cambios en las políticas de privacidad afectan a todos los usuarios. Verifica con el
                  área legal qué normativa resulta aplicable antes de modificar configuraciones críticas.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
