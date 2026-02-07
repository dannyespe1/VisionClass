import { useEffect, useMemo, useState } from "react";
import { Search, Star, Clock, Users, BookOpen } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { parseCourseMeta } from "../lib/courseMeta";

interface CursosSectionProps {
  onCourseSelect: (courseId: number) => void;
}

type CourseCard = {
  id: number;
  title: string;
  instructor: string;
  rating: number;
  students: number;
  duration: string;
  level: string;
  price: string;
  image: string;
  category: string;
  description: string;
  lessonsCount: number;
  modulesCount: number;
  materialsCount: number;
};

type EnrollmentForm = {
  fullName: string;
  email: string;
  studentCode: string;
  career: string;
  semester: string;
  phone: string;
  notes: string;
};

export function CursosSection({ onCourseSelect }: CursosSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ first_name: string; last_name: string; email: string } | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollCourse, setEnrollCourse] = useState<CourseCard | null>(null);
  const [enrollForm, setEnrollForm] = useState<EnrollmentForm>({
    fullName: "",
    email: "",
    studentCode: "",
    career: "",
    semester: "",
    phone: "",
    notes: "",
  });
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const { token } = useAuth();

  const categories = [
    { id: "todos", label: "Todos los cursos" },
    { id: "programacion", label: "Programacion" },
    { id: "ia", label: "Inteligencia Artificial" },
    { id: "diseno", label: "Diseno" },
    { id: "negocios", label: "Negocios" },
    { id: "ciencias", label: "Ciencias" },
  ];

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [data, enrollments, meData, modulesData, lessonsData, materialsData] = await Promise.all([
          apiFetch<any[]>("/api/courses/", {}, token),
          apiFetch<any[]>("/api/enrollments/", {}, token),
          apiFetch<{ first_name: string; last_name: string; email: string }>("/api/me/", {}, token),
          apiFetch<any[]>("/api/course-modules/", {}, token),
          apiFetch<any[]>("/api/course-lessons/", {}, token),
          apiFetch<any[]>("/api/course-materials/", {}, token),
        ]);
        setMe(meData || null);
        const filtered = data.filter((c) => (c.title || "").toLowerCase() !== "baseline d2r");
        const modulesByCourse = new Map<number, number>();
        const lessonsByCourse = new Map<number, number>();
        const materialsByCourse = new Map<number, number>();

        (modulesData || []).forEach((m) => {
          if (!m.course) return;
          const courseId = m.course.id;
          if (!courseId) return;
          modulesByCourse.set(courseId, (modulesByCourse.get(courseId) || 0) + 1);
        });
        (lessonsData || []).forEach((l) => {
          if (!l.module || !l.module.course) return;
          const courseId = l.module.course.id;
          if (!courseId) return;
          lessonsByCourse.set(courseId, (lessonsByCourse.get(courseId) || 0) + 1);
        });
        (materialsData || []).forEach((mat) => {
          if (!mat.lesson || !mat.lesson.module || !mat.lesson.module.course) return;
          const courseId = mat.lesson.module.course.id;
          if (!courseId) return;
          materialsByCourse.set(courseId, (materialsByCourse.get(courseId) || 0) + 1);
        });
        const enrolled = new Set<number>(
          (enrollments || []).filter((e) => e.course).map((e) => e.course.id).filter(Boolean)
        );
        setEnrolledIds(enrolled);
        setCourses(
          filtered.map((c) => {
            const { meta, cleanDescription } = parseCourseMeta(c.description);
            const lessonsCount = lessonsByCourse.get(c.id) || 0;
            const modulesCount = modulesByCourse.get(c.id) || (meta.modules || []).length || 0;
            const materialsCount = materialsByCourse.get(c.id) || 0;
            const duration = lessonsCount ? `${lessonsCount} lecciones` : "Contenido por cargar";
            return {
              id: c.id,
              title: c.title,
              instructor: c.owner.username || "Profesor",
              rating: 4.7,
              students: Math.floor(Math.random() * 8000) + 200,
              duration,
              level: meta.level || "Intermedio",
              price: "Gratis",
              image: meta.thumbnail || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5w=800",
              category: meta.field || "programacion",
              description: cleanDescription || "Curso generado por el profesor.",
              lessonsCount,
              modulesCount,
              materialsCount,
            };
          })
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar cursos";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const openEnroll = (course: CourseCard) => {
    if (!token) return;
    if (enrolledIds.has(course.id)) {
      onCourseSelect(course.id);
      return;
    }
    const fullName = `${me?.first_name || ""} ${me?.last_name || ""}`.trim();
    setEnrollForm({
      fullName,
      email: me?.email || "",
      studentCode: "",
      career: "",
      semester: "",
      phone: "",
      notes: "",
    });
    setEnrollCourse(course);
    setEnrollOpen(true);
  };

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "todos" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [courses, searchQuery, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Explorar Cursos</h1>
        <p className="text-gray-600">Descubre cursos disenados con tecnología de vision por computadora</p>
        {loading && <p className="text-sm text-slate-500 mt-2">Cargando cursos...</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar cursos, instructores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12"
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-gray-600">
          {filteredCourses.length} curso{filteredCourses.length !== 1 ? "s" : ""}{" "}
          {selectedCategory !== "todos" &&
            `en ${categories.find((c) => c.id === selectedCategory)?.label || ""}`}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 transition transform hover:-translate-y-1 hover:shadow-xl group"
          >
            <div className="relative h-48 overflow-hidden">
              <ImageWithFallback
                src={course.image}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 right-3">
                <span className="px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-sm">
                  {course.level}
                </span>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl mb-2 line-clamp-2">{course.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{course.instructor}</p>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{course.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{course.students.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span>{course.modulesCount} modulos</span>
                <span>{course.lessonsCount} lecciones</span>
                <span>{course.materialsCount} materiales</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-xl text-blue-600">{course.price}</div>
                <Button size="sm" onClick={() => openEnroll(course)}>
                  {enrolledIds.has(course.id) ? "Continuar" : "Inscribirse"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl mb-2">No se encontraron cursos</h3>
          <p className="text-gray-600 mb-6">Intenta con otros terminos de busqueda o categorias</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("todos");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar inscripcion</DialogTitle>
            <DialogDescription>
              Completa los datos para matricularte en {enrollCourse?.title || "el curso"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={enrollForm.fullName}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Nombre y apellido"
              />
            </div>
            <div className="space-y-2">
              <Label>Correo institucional</Label>
              <Input
                value={enrollForm.email}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@universidad.edu"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Codigo de estudiante</Label>
              <Input
                value={enrollForm.studentCode}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, studentCode: e.target.value }))}
                placeholder="2025-0001"
              />
            </div>
            <div className="space-y-2">
              <Label>Carrera</Label>
              <Input
                value={enrollForm.career}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, career: e.target.value }))}
                placeholder="Ingenieria en Sistemas"
              />
            </div>
            <div className="space-y-2">
              <Label>Semestre</Label>
              <Input
                value={enrollForm.semester}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, semester: e.target.value }))}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input
                value={enrollForm.phone}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+593 999 000 000"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={enrollForm.notes}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Necesidades o comentarios adicionales"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setEnrollOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!token || !enrollCourse || enrollSubmitting}
              onClick={async () => {
                if (!token || !enrollCourse) return;
                try {
                  setEnrollSubmitting(true);
                  await apiFetch(
                    "/api/enrollments/",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        course_id: enrollCourse.id,
                        enrollment_data: {
                          full_name: enrollForm.fullName,
                          email: enrollForm.email,
                          student_code: enrollForm.studentCode,
                          career: enrollForm.career,
                          semester: enrollForm.semester,
                          phone: enrollForm.phone,
                          notes: enrollForm.notes,
                        },
                      }),
                    },
                    token
                  );
                  setEnrolledIds((prev) => new Set(prev).add(enrollCourse.id));
                  setEnrollOpen(false);
                  onCourseSelect(enrollCourse.id);
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "No se pudo inscribir";
                  setError(msg);
                } finally {
                  setEnrollSubmitting(false);
                }
              }}
            >
              {enrollSubmitting ? "Inscribiendo..." : "Confirmar inscripcion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
