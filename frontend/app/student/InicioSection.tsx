import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid, List, CheckCircle2, BookOpen, Eye, X } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { parseCourseMeta } from "../lib/courseMeta";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

interface InicioSectionProps {
  onCourseSelect: (courseId: number) => void;
}

type EnrolledCourse = {
  id: number;
  title: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  nextLesson: string;
  image: string;
  category: string;
  attentionLevel: number;
};

type ModuleItem = {
  id: number;
  order: number;
  courseId: number;
};

type LessonItem = {
  id: number;
  title: string;
  order: number;
  moduleId: number;
  courseId: number;
  moduleOrder: number;
};

export function InicioSection({ onCourseSelect }: InicioSectionProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [moduleData, setModuleData] = useState<ModuleItem[]>([]);
  const [lessonData, setLessonData] = useState<LessonItem[]>([]);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [syllabusCourseId, setSyllabusCourseId] = useState<number | null>(null);
  const [showD2RBanner, setShowD2RBanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [enrollments, modulesData, lessonsData] = await Promise.all([
          apiFetch<any[]>("/api/enrollments/", {}, token),
          apiFetch<any[]>("/api/course-modules/", {}, token),
          apiFetch<any[]>("/api/course-lessons/", {}, token),
        ]);
        const filtered = (enrollments || []).filter((e) => {
          const title = (e.course.title || "").toLowerCase();
          return title && title !== "baseline d2r";
        });
        const modules: ModuleItem[] = (modulesData || [])
          .filter((m) => (m.course.title || "").toLowerCase() !== "baseline d2r")
          .map((m) => ({
            id: m.id,
            order: m.order || 0,
            courseId: m.course.id,
          }));
        const lessons: LessonItem[] = (lessonsData || [])
          .filter((l) => (l.module.course.title || "").toLowerCase() !== "baseline d2r")
          .map((l) => {
            const moduleOrder = modules.find((m) => m.id === l.module.id).order || 0;
            return {
              id: l.id,
              title: l.title || "Leccion",
              order: l.order || 0,
              moduleId: l.module.id,
              courseId: l.module.course.id,
              moduleOrder,
            };
          });
        setModuleData(modules);
        setLessonData(lessons);
        const mapped = filtered.map((enrollment) => {
          const course = enrollment.course || {};
          const { meta } = parseCourseMeta(course.description);
          const courseLessons = lessons
            .filter((l) => l.courseId === course.id)
            .sort((a, b) => (a.moduleOrder - b.moduleOrder) || (a.order - b.order));
          const data = enrollment.enrollment_data || {};
          const totalLessons =
            data.total_lessons ||
            courseLessons.length ||
            (meta.modules || []).reduce((acc, m) => acc + (m.lessons || 0), 0);
          const completedLessons = data.completed_lessons || 0;
          const progress =
            data.progress_percent ||
            (totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0);
          const lastLessonId = data.last_lesson_id;
          const lastIndex = courseLessons.findIndex((l) => l.id === lastLessonId);
          const nextLesson =
            (lastIndex >= 0 ? courseLessons[lastIndex + 1]?.title : courseLessons[0]?.title) ||
            meta.modules?.[0]?.name ||
            "Contenido inicial";
          return {
            id: course.id,
            title: course.title || "Curso",
            instructor: course.owner.username || "Profesor",
            progress,
            totalLessons,
            completedLessons,
            nextLesson,
            image: meta.thumbnail || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5w=800",
            category: "Programación",
            attentionLevel: 85,
          } as EnrolledCourse;
        });
        setCourses(mapped);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar los cursos";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const hasCourses = courses.length > 0;
  const coursesView = useMemo(() => courses, [courses]);
  const syllabusCourse = coursesView.find((c) => c.id === syllabusCourseId) || null;
  const totalCourses = courses.length;
  const totalCompleted = courses.reduce((sum, course) => sum + (course.completedLessons || 0), 0);
  const totalLessons = courses.reduce((sum, course) => sum + (course.totalLessons || 0), 0);
  const progressPercent = totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const goToD2R = () => router.push("/d2r");
  const syllabusModules = useMemo(() => {
    if (!syllabusCourseId) return [];
    const modules = moduleData
      .filter((m) => m.courseId === syllabusCourseId)
      .sort((a, b) => a.order - b.order);
    return modules.map((m, idx) => ({
      id: m.id,
      title: `Módulo ${idx + 1}`,
      lessons: lessonData
        .filter((l) => l.moduleId === m.id)
        .sort((a, b) => (a.moduleOrder - b.moduleOrder) || (a.order - b.order)),
    }));
  }, [moduleData, lessonData, syllabusCourseId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Bienvenido de nuevo</h2>
            <p className="text-sm text-slate-500">Continúa con tu aprendizaje donde lo dejaste.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showD2RBanner && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-6 py-6 sm:px-8 sm:py-7 shadow-md">
            <button
              type="button"
              className="absolute top-4 right-4 rounded-full bg-white/15 p-2 hover:bg-white/25"
              onClick={() => setShowD2RBanner(false)}
              aria-label="Cerrar recordatorio"
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pr-12">
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Eye className="h-7 w-7 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">Muestreo mensual de atención</h3>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-white/20">5-7 minutos</span>
                  </div>
                  <p className="text-sm text-blue-50 max-w-xl">
                    Es momento de actualizar tu perfil atencional. Este breve test nos ayuda a personalizar
                    tu experiencia de aprendizaje y ofrecerte mejores recomendaciones.
                  </p>
                  <p className="text-[11px] text-blue-100/80">
                    Ultimo test realizado hace 28 dias - Proxima sugerencia en 2 dias
                  </p>
                </div>
              </div>
              <div className="flex flex-col lg:items-end gap-2 w-full lg:w-auto">
                <Button
                  type="button"
                  onClick={goToD2R}
                  className="rounded-xl bg-white text-blue-700 hover:bg-blue-50 w-full lg:w-auto"
                >
                  Realizar Test D2R ahora
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-white/40 text-white px-4 py-2 text-xs font-medium hover:bg-white/10"
                  onClick={() => setShowD2RBanner(false)}
                >
                  Recordar más tarde
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg">
            <div>
              <p className="text-xs text-slate-500">Cursos activos</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{totalCourses}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg">
            <div>
              <p className="text-xs text-slate-500">Lecciones completadas</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{totalCompleted}</p>
              <p className="text-[11px] text-slate-400">{progressPercent}% del total</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg">
            <div>
              <p className="text-xs text-slate-500">Tiempo de estudio</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">--</p>
              <p className="text-[11px] text-slate-400">Esta semana</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <span className="text-sm font-semibold">h</span>
            </div>
          </div>
        </section>
      </header>

      {loading && <p className="text-sm text-slate-500">Cargando cursos...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!hasCourses && !loading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900">Aun no tienes cursos inscritos</h3>
          <p className="text-sm text-slate-500">Explora la pestana de cursos para inscribirte.</p>
        </div>
      )}

      {hasCourses && viewMode === "grid" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesView.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm transition transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-48">
                <ImageWithFallback src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-sm">{course.category}</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{course.instructor}</p>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-600">Progreso</span>
                    <span className="text-blue-600">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} />
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Siguiente leccion:</div>
                  <div className="text-sm">{course.nextLesson}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {course.completedLessons}/{course.totalLessons} lecciones
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-600">{course.attentionLevel}% atención</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => onCourseSelect(course.id)}>
                  Continuar
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setSyllabusCourseId(course.id);
                    setSyllabusOpen(true);
                  }}
                >
                  Ver temario
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasCourses && viewMode === "list" && (
        <div className="space-y-4">
          {coursesView.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl p-6 shadow-sm transition transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden">
                  <ImageWithFallback src={course.image} alt={course.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-600">{course.instructor}</p>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{course.category}</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-gray-600">Progreso</span>
                        <span className="text-blue-600">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4" />
                        {course.completedLessons}/{course.totalLessons} lecciones
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm text-gray-600">{course.attentionLevel}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Siguiente: <span className="text-gray-900">{course.nextLesson}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => onCourseSelect(course.id)}>Continuar</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSyllabusCourseId(course.id);
                          setSyllabusOpen(true);
                        }}
                      >
                        Ver temario
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={syllabusOpen} onOpenChange={setSyllabusOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Temario del curso</DialogTitle>
            <DialogDescription>{syllabusCourse?.title || "Curso"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
            {syllabusModules.length === 0 && (
              <p className="text-sm text-slate-500">Este curso aun no tiene temario cargado.</p>
            )}
            {syllabusModules.map((module) => (
              <div key={module.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="font-semibold text-slate-900">{module.title}</div>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {module.lessons.length === 0 && <p className="text-xs text-slate-500">Sin lecciones.</p>}
                  {module.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between">
                      <span>{lesson.title}</span>
                      <span className="text-xs text-slate-500">Leccion {lesson.order}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
