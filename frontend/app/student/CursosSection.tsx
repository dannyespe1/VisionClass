import { useState } from "react";
import { Search, Star, Clock, Users, BookOpen } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface CursosSectionProps {
  onCourseSelect: (courseTitle: string) => void;
}

export function CursosSection({ onCourseSelect }: CursosSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");

  const categories = [
    { id: "todos", label: "Todos los cursos" },
    { id: "programacion", label: "Programacion" },
    { id: "ia", label: "Inteligencia Artificial" },
    { id: "diseno", label: "Diseno" },
    { id: "negocios", label: "Negocios" },
    { id: "ciencias", label: "Ciencias" },
  ];

  const courses = [
    {
      id: 1,
      title: "Python para Ciencia de Datos",
      instructor: "Dr. Miguel Torres",
      rating: 4.8,
      students: 12500,
      duration: "40 horas",
      level: "Intermedio",
      price: "$49.99",
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
      category: "programacion",
      description: "Aprende Python desde cero y aplicalo en ciencia de datos",
    },
    {
      id: 2,
      title: "Deep Learning Avanzado",
      instructor: "Dra. Sofia Chen",
      rating: 4.9,
      students: 8200,
      duration: "55 horas",
      level: "Avanzado",
      price: "$79.99",
      image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800",
      category: "ia",
      description: "Domina las redes neuronales profundas y sus aplicaciones",
    },
    {
      id: 3,
      title: "Diseno de Interfaces Modernas",
      instructor: "Prof. Laura Gomez",
      rating: 4.7,
      students: 15300,
      duration: "30 horas",
      level: "Principiante",
      price: "$39.99",
      image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
      category: "diseno",
      description: "Crea interfaces atractivas y funcionales con las ultimas tendencias",
    },
    {
      id: 4,
      title: "Desarrollo Web Full Stack",
      instructor: "Ing. Roberto Sanchez",
      rating: 4.8,
      students: 18900,
      duration: "65 horas",
      level: "Intermedio",
      price: "$59.99",
      image: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800",
      category: "programacion",
      description: "Conviertete en desarrollador full stack con React y Node.js",
    },
    {
      id: 5,
      title: "Analisis de Negocios con IA",
      instructor: "MBA. Patricia Ruiz",
      rating: 4.6,
      students: 9100,
      duration: "35 horas",
      level: "Intermedio",
      price: "$54.99",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
      category: "negocios",
      description: "Aplica inteligencia artificial para tomar decisiones de negocio",
    },
    {
      id: 6,
      title: "Biologia Computacional",
      instructor: "Dr. Fernando Vega",
      rating: 4.7,
      students: 5600,
      duration: "45 horas",
      level: "Avanzado",
      price: "$69.99",
      image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800",
      category: "ciencias",
      description: "Explora la interseccion entre biologia y computacion",
    },
  ];

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "todos" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Explorar Cursos</h1>
        <p className="text-gray-600">Descubre cursos disenados con tecnologia de vision por computadora</p>
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
            `en ${categories.find((c) => c.id === selectedCategory)?.label}`}
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

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-xl text-blue-600">{course.price}</div>
                <Button size="sm" onClick={() => onCourseSelect(course.title)}>
                  Inscribirse
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
    </div>
  );
}
