import { useState } from "react";
import { Grid, List, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface InicioSectionProps {
  onCourseSelect: (courseTitle: string) => void;
}

export function InicioSection({ onCourseSelect }: InicioSectionProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const enrolledCourses = [
    {
      id: 1,
      title: "Introduccion a Python",
      instructor: "Dr. Carlos Martinez",
      progress: 65,
      totalLessons: 24,
      completedLessons: 16,
      nextLesson: "Funciones y Modulos",
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
      category: "Programacion",
      attentionLevel: 85,
    },
    {
      id: 2,
      title: "Machine Learning Basico",
      instructor: "Dra. Ana Rodriguez",
      progress: 42,
      totalLessons: 30,
      completedLessons: 13,
      nextLesson: "Regresion Lineal",
      image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800",
      category: "Inteligencia Artificial",
      attentionLevel: 78,
    },
    {
      id: 3,
      title: "Diseno UX/UI",
      instructor: "Prof. Laura Gomez",
      progress: 88,
      totalLessons: 18,
      completedLessons: 16,
      nextLesson: "Prototipado Avanzado",
      image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
      category: "Diseno",
      attentionLevel: 92,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Mis Cursos</h2>
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

      {viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map((course) => (
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
                    <span className="text-sm text-gray-600">{course.attentionLevel}% atencion</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => onCourseSelect(course.title)}>
                  Continuar
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {enrolledCourses.map((course) => (
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
                    <Button onClick={() => onCourseSelect(course.title)}>Continuar</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
