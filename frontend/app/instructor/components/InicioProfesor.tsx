"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen, TrendingUp, Eye, Power } from "lucide-react";
import { Switch } from "../../ui/switch";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../ui/button";
import type {
  CourseApi,
  CourseLessonApi,
  CourseMaterialApi,
  CourseModuleApi,
  EnrollmentApi,
} from "../../lib/api-types";

type ModuleMeta = { name: string; lessons: number; tests: number };
type CourseDescriptionMeta = { thumbnail?: string; modules?: ModuleMeta[] };

type CourseItem = {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  image: string;
  students: number;
  avgAttention: number | null;
  lessonsCompleted: string;
  category: string;
  lastUpdated: string;
  modules: ModuleMeta[];
};

type CourseModule = {
  id: number;
  title: string;
  order: number;
  durationHours: number;
  courseId: number;
};

type CourseLesson = {
  id: number;
  title: string;
  order: number;
  moduleId: number;
  courseId: number;
};

type CourseMaterial = {
  id: number;
  title: string;
  materialType: string;
  lessonId: number;
  moduleId: number;
  courseId: number;
};

function extractMeta(description: string): CourseDescriptionMeta {
  if (!description) return {};
  const match = description.match(/\[meta\]:\s*(\{.*\})/);
  if (!match || !match[1]) return {};
  try {
    return JSON.parse(match[1]) as CourseDescriptionMeta;
  } catch {
    return {};
  }
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function latestActivityLabel(enrollments: EnrollmentApi[]) {
  const timestamps = enrollments
    .flatMap((enrollment) => [
      enrollment.enrollment_data.attention_updated_at,
      enrollment.enrollment_data.last_attention_at,
      enrollment.enrollment_data.last_update_at,
      enrollment.enrollment_data.last_quiz_at,
    ])
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());
  return timestamps.length === 0
    ? "Sin actividad"
    : new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(timestamps[0]);
}

function stripMeta(description: string) {
  if (!description) return "";
  return description.replace(/\s*\[meta\]:\s*\{[\s\S]*\}\s*/, "").trim();
}

type TabId = "inicio" | "materiales" | "estadisticas";

type InicioProfesorProps = {
  onTabChange: (tab: TabId) => void;
};

export function InicioProfesor({ onTabChange }: InicioProfesorProps) {
  const { token } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<CourseItem | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [data, enrollmentData, moduleData, lessonData, materialData] = await Promise.all([
          apiFetch<CourseApi[]>("/api/courses/", {}, token),
          apiFetch<EnrollmentApi[]>("/api/enrollments/", {}, token),
          apiFetch<CourseModuleApi[]>("/api/course-modules/", {}, token),
          apiFetch<CourseLessonApi[]>("/api/course-lessons/", {}, token),
          apiFetch<CourseMaterialApi[]>("/api/course-materials/", {}, token),
        ]);
        const mapped = data.map((c, idx) => {
            const meta = extractMeta(c.description);
            const courseEnrollments = enrollmentData.filter((enrollment) => enrollment.course.id === c.id);
            const attentionValues = courseEnrollments
              .map((enrollment) => enrollment.enrollment_data.attention_avg ?? enrollment.enrollment_data.attention_last)
              .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
            const progressValues = courseEnrollments
              .map((enrollment) => enrollment.enrollment_data.progress_percent ?? enrollment.enrollment_data.progress)
              .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
            return {
              id: c.id,
              title: c.title || `Curso ${idx + 1}`,
              description: stripMeta(c.description || ""),
              is_active: !!c.is_active,
              image:
                meta.thumbnail ||
                c.thumbnail ||
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
              students: courseEnrollments.length,
              avgAttention: average(attentionValues),
              lessonsCompleted: progressValues.length ? `${average(progressValues)}%` : "Sin progreso",
              category: "Curso",
              lastUpdated: latestActivityLabel(courseEnrollments),
              modules: meta.modules || [],
            };
          });
        setCourses(mapped);
        setModules(
          (moduleData || []).map((m) => ({
              id: m.id,
              title: m.title,
              order: m.order || 0,
              durationHours: m.duration_hours || 0,
              courseId: m.course.id,
            }))
        );
        setLessons(
          (lessonData || []).map((l) => ({
              id: l.id,
              title: l.title,
              order: l.order || 0,
              moduleId: l.module.id,
              courseId: l.module.course.id,
            }))
        );
        setMaterials(
          (materialData || []).map((mat) => ({
              id: mat.id,
              title: mat.title,
              materialType: mat.material_type,
              lessonId: mat.lesson.id,
              moduleId: mat.lesson.module.id,
              courseId: mat.lesson.module.course.id,
            }))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar los cursos";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const toggleCourseActive = async (courseId: number) => {
    if (!token) return;
    const current = courses.find((course) => course.id === courseId);
    if (!current) return;
    try {
      await apiFetch<CourseApi>(
        `/api/courses/${courseId}/`,
        { method: "PATCH", body: JSON.stringify({ is_active: !current.is_active }) },
        token,
      );
      setCourses((previous) =>
        previous.map((course) =>
          course.id === courseId ? { ...course, is_active: !course.is_active } : course,
        ),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cambiar el estado del curso.");
    }
  };

  const goToTab = (tab: TabId) => {
    onTabChange(tab);
    if (typeof window !== "undefined") {
      window.location.hash = tab;
    }
  };

  const activeCourses = useMemo(() => courses.filter((c) => c.is_active).length, [courses]);
  const totalStudents = useMemo(
    () => courses.reduce((sum, c) => sum + (c.students || 0), 0),
    [courses]
  );
  const avgAttention = useMemo(() => {
    const values = courses
      .map((course) => course.avgAttention)
      .filter((value): value is number => value !== null);
    return average(values);
  }, [courses]);

  const buildStructure = (courseId: number) => {
    const modulesForCourse = modules
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.order - b.order);
    return modulesForCourse.map((m) => {
      const lessonsForModule = lessons
        .filter((l) => l.moduleId === m.id)
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          ...l,
          materials: materials.filter((mat) => mat.lessonId === l.id),
        }));
      return { ...m, lessons: lessonsForModule };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl mb-1">{courses.length}</div>
          <div className="text-sm text-muted-foreground">Cursos totales</div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Power className="w-6 h-6 text-success" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl mb-1">{activeCourses}</div>
          <div className="text-sm text-muted-foreground">Cursos activos</div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl mb-1">{totalStudents}</div>
          <div className="text-sm text-muted-foreground">Estudiantes totales</div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-warning" />
            </div>
            <span className="text-sm text-muted-foreground">Promedio</span>
          </div>
          <div className="text-2xl mb-1">{avgAttention === null ? "—" : `${avgAttention}%`}</div>
          <div className="text-sm text-muted-foreground">Atención General</div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl mb-4">Mis Cursos</h2>
        {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        {courses.length === 0 && !loading && (
          <div className="bg-card rounded-xl p-6 shadow-sm border text-sm text-muted-foreground">
            Aún no tienes cursos. Crea uno desde la sección Materiales.
          </div>
        )}
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className={`bg-card rounded-xl p-6 shadow-sm transition-all ${
                course.is_active ? "border-l-4 border-success" : "opacity-75"
              }`}
            >
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl">{course.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            course.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {course.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{course.category || "Curso"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {course.is_active ? "Desactivar" : "Activar"}
                      </span>
                      <Switch
                        checked={!!course.is_active}
                        onCheckedChange={() => toggleCourseActive(course.id)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Estudiantes</div>
                        <div>{course.students ?? "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Atención Prom.</div>
                        <div>{course.avgAttention === null ? "—" : `${course.avgAttention}%`}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Progreso</div>
                        <div>{course.lessonsCompleted ?? "—"}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground">Última actualización</div>
                      <div className="text-sm">{course.lastUpdated || "Reciente"}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                      onClick={() => setSelectedDetails(course)}
                    >
                      Ver Detalles
                    </button>
                    <button
                      className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem("instructor_material_course_id", String(course.id));
                        }
                        setSelectedDetails(course);
                        goToTab("materiales");
                      }}
                    >
                      Subir Material
                    </button>
                    <button
                      className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                      onClick={() => {
                        setSelectedDetails(course);
                        goToTab("estadisticas");
                      }}
                    >
                      Estadísticas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDetails && (
        <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{selectedDetails.title}</h3>
              <p className="text-sm text-muted-foreground">
                Estado: {selectedDetails.is_active ? "Activo" : "Inactivo"} | Estudiantes: {selectedDetails.students ?? "—"}
              </p>
            </div>
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedDetails(null)}
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <p className="text-sm text-foreground whitespace-pre-line">
                {selectedDetails.description || "Sin descripción"}
              </p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  Atención prom.: {selectedDetails.avgAttention === null ? "—" : `${selectedDetails.avgAttention}%`}
                </span>
                <span>Última actualización: {selectedDetails.lastUpdated || "Reciente"}</span>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Estructura del curso</h4>
                {buildStructure(selectedDetails.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">Este curso aún no tiene módulos creados.</p>
                )}
                {buildStructure(selectedDetails.id).map((module) => (
                  <div key={module.id} className="border border-border rounded-lg p-3 bg-muted">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-foreground">{module.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Duración: {Math.max(1, Math.round(module.durationHours * 60))} min
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {module.lessons.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin lecciones en este módulo.</p>
                      )}
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="border border-border rounded-md px-3 py-2 bg-card">
                          <div className="text-sm font-medium">{lesson.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Materiales: {lesson.materials.length}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {lesson.materials.map((mat) => (
                              <span key={mat.id} className="px-2 py-1 rounded-full bg-muted">
                                {mat.title} ({mat.materialType})
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border">
                <ImageWithFallback
                  src={selectedDetails.image || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"}
                  alt={selectedDetails.title}
                  className="w-full h-40 object-cover"
                />
              </div>
              <div className="text-sm text-muted-foreground">
              <p>Progreso: {selectedDetails.lessonsCompleted ?? "—"}</p>
                <p>Categoría: {selectedDetails.category || "Curso"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("instructor_material_course_id", String(selectedDetails.id));
                    }
                    setSelectedDetails(selectedDetails);
                    goToTab("materiales");
                  }}
                >
                  Subir material
                </Button>
                <Button variant="outline" onClick={() => setSelectedDetails(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-primary/10 rounded-xl p-6">
        <h3 className="mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <button
            className="bg-card p-4 rounded-lg hover:shadow-md transition-shadow text-left"
            onClick={() => goToTab("materiales")}
          >
            <BookOpen className="w-8 h-8 text-primary mb-2" />
            <div className="mb-1">Crear Nuevo Curso</div>
            <p className="text-sm text-muted-foreground">Configura un nuevo curso</p>
          </button>
          <button
            className="bg-card p-4 rounded-lg hover:shadow-md transition-shadow text-left"
            onClick={() => goToTab("estadisticas")}
          >
            <Users className="w-8 h-8 text-success mb-2" />
            <div className="mb-1">Ver Estudiantes</div>
            <p className="text-sm text-muted-foreground">Lista de todos los estudiantes</p>
          </button>
          <button
            className="bg-card p-4 rounded-lg hover:shadow-md transition-shadow text-left"
            onClick={() => goToTab("estadisticas")}
          >
            <Eye className="w-8 h-8 text-primary mb-2" />
            <div className="mb-1">Reportes de Atención</div>
            <p className="text-sm text-muted-foreground">Análisis detallados</p>
          </button>
        </div>
      </div>
    </div>
  );
}
