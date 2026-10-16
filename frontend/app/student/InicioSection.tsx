import { useEffect, useMemo, useState } from "react";
import { Grid, List, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { parseCourseMeta } from "../lib/courseMeta";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import type { CourseLessonApi, CourseModuleApi, EnrollmentApi } from "../lib/api-types";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [moduleData, setModuleData] = useState<ModuleItem[]>([]);
  const [lessonData, setLessonData] = useState<LessonItem[]>([]);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [syllabusCourseId, setSyllabusCourseId] = useState<number | null>(null);
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
          apiFetch<EnrollmentApi[]>("/api/enrollments/", {}, token),
          apiFetch<CourseModuleApi[]>("/api/course-modules/", {}, token),
          apiFetch<CourseLessonApi[]>("/api/course-lessons/", {}, token),
        ]);
        const filtered = (enrollments || []).filter((e) => Boolean(e.course));
        const modules: ModuleItem[] = (modulesData || [])
          .filter((m) => Boolean(m.course))
          .map((m) => ({
            id: m.id,
            order: m.order || 0,
            courseId: m.course.id,
          }));
        const lessons: LessonItem[] = (lessonsData || [])
          .filter((l) => Boolean(l.module && l.module.course))
          .map((l) => {
            const moduleOrder = modules.find((m) => m.id === l.module.id)?.order || 0;
            return {
              id: l.id,
              title: l.title || "Lección",
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
            instructor: course.owner.username || "Docente",
            progress,
            totalLessons,
            completedLessons,
            nextLesson,
            image: meta.thumbnail || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
            category: "Programación",
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
            <h2 className="text-2xl font-semibold text-foreground">Bienvenido de nuevo</h2>
            <p className="text-sm text-muted-foreground">Continúa con tu aprendizaje donde lo dejaste.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-border"
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-border"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div>
              <p className="text-xs text-muted-foreground">Cursos activos</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{totalCourses}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div>
              <p className="text-xs text-muted-foreground">Lecciones completadas</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{totalCompleted}</p>
              <p className="text-[11px] text-muted-foreground">{progressPercent}% del total</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div>
              <p className="text-xs text-muted-foreground">Tiempo de estudio</p>
              <p className="mt-1 text-xl font-semibold text-foreground">--</p>
              <p className="text-[11px] text-muted-foreground">Esta semana</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="text-sm font-semibold">h</span>
            </div>
          </div>
        </section>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Cargando cursos…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!hasCourses && !loading && (
        <div className="rounded-2xl border border-border bg-card py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Aún no tienes cursos inscritos</h3>
          <p className="text-sm text-muted-foreground">Explora la pestaña de cursos para inscribirte.</p>
        </div>
      )}

      {hasCourses && viewMode === "grid" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesView.map((course) => (
            <div
              key={course.id}
              className="overflow-hidden rounded-xl bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-48">
                <ImageWithFallback src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className="rounded-full bg-card/95 px-3 py-1 text-sm backdrop-blur-sm">{course.category}</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl mb-2">{course.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{course.instructor}</p>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="text-primary">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} />
                </div>

                <div className="mb-4 rounded-lg bg-muted p-3">
                  <div className="mb-1 text-sm text-muted-foreground">Siguiente lección:</div>
                  <div className="text-sm">{course.nextLesson}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4" />
                    {course.completedLessons}/{course.totalLessons} lecciones
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">Progreso: {course.progress}%</span>
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
              className="rounded-xl bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden">
                  <ImageWithFallback src={course.image} alt={course.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl mb-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">{course.instructor}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm">{course.category}</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="text-primary">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4" />
                        {course.completedLessons}/{course.totalLessons} lecciones
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-sm text-muted-foreground">Progreso: {course.progress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Siguiente: <span className="text-foreground">{course.nextLesson}</span>
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
              <p className="text-sm text-muted-foreground">Este curso aún no tiene temario cargado.</p>
            )}
            {syllabusModules.map((module) => (
              <div key={module.id} className="rounded-lg border border-border bg-muted p-3">
                <div className="font-semibold text-foreground">{module.title}</div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {module.lessons.length === 0 && <p className="text-xs text-muted-foreground">Sin lecciones.</p>}
                  {module.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between">
                      <span>{lesson.title}</span>
                      <span className="text-xs text-muted-foreground">Lección {lesson.order}</span>
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
