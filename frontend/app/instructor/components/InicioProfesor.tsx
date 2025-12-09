import { useState } from "react";
import { Users, BookOpen, TrendingUp, Eye, Power } from "lucide-react";
import { Switch } from "../../ui/switch";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

export function InicioProfesor() {
  const [courses, setCourses] = useState([
    {
      id: 1,
      title: "Introducción a Python",
      students: 45,
      avgAttention: 85,
      lessonsCompleted: "24/30",
      isActive: true,
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
      category: "Programación",
      lastUpdated: "Hace 2 horas",
    },
    {
      id: 2,
      title: "Machine Learning Básico",
      students: 32,
      avgAttention: 78,
      lessonsCompleted: "18/30",
      isActive: true,
      image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800",
      category: "Inteligencia Artificial",
      lastUpdated: "Hace 1 día",
    },
    {
      id: 3,
      title: "Estructuras de Datos",
      students: 38,
      avgAttention: 82,
      lessonsCompleted: "15/28",
      isActive: false,
      image: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=800",
      category: "Programación",
      lastUpdated: "Hace 3 días",
    },
  ]);

  const toggleCourseActive = (courseId: number) => {
    setCourses(
      courses.map((course) =>
        course.id === courseId ? { ...course, isActive: !course.isActive } : course
      )
    );
  };

  const activeCourses = courses.filter((c) => c.isActive).length;
  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
  const avgAttention = Math.round(
    courses.reduce((sum, c) => sum + c.avgAttention, 0) / courses.length
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Panel del Profesor</h1>
        <p className="text-gray-600">Gestiona tus cursos y monitorea el rendimiento</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{courses.length}</div>
          <div className="text-sm text-gray-600">Cursos Totales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Power className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{activeCourses}</div>
          <div className="text-sm text-gray-600">Cursos Activos</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{totalStudents}</div>
          <div className="text-sm text-gray-600">Estudiantes Totales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-600">Promedio</span>
          </div>
          <div className="text-2xl mb-1">{avgAttention}%</div>
          <div className="text-sm text-gray-600">Atención General</div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="mb-6">
        <h2 className="text-2xl mb-6">Mis Cursos</h2>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className={`bg-white rounded-xl p-6 shadow-sm transition-all ${
              course.isActive ? "border-l-4 border-green-500" : "opacity-75"
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
                          course.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {course.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{course.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {course.isActive ? "Desactivar" : "Activar"}
                    </span>
                    <Switch
                      checked={course.isActive}
                      onCheckedChange={() => toggleCourseActive(course.id)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600">Estudiantes</div>
                      <div>{course.students}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600">Atención Prom.</div>
                      <div>{course.avgAttention}%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600">Progreso</div>
                      <div>{course.lessonsCompleted}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">Última actualización</div>
                    <div className="text-sm">{course.lastUpdated}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Ver Detalles
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Subir Material
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Estadísticas
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6">
        <h3 className="mb-4">Acciones Rápidas</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <BookOpen className="w-8 h-8 text-blue-600 mb-2" />
            <div className="mb-1">Crear Nuevo Curso</div>
            <p className="text-sm text-gray-600">Configura un nuevo curso</p>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <div className="mb-1">Ver Estudiantes</div>
            <p className="text-sm text-gray-600">Lista de todos los estudiantes</p>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <Eye className="w-8 h-8 text-purple-600 mb-2" />
            <div className="mb-1">Reportes de Atención</div>
            <p className="text-sm text-gray-600">Análisis detallados</p>
          </button>
        </div>
      </div>
    </div>
  );
}
