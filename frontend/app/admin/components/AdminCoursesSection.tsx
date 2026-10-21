"use client";

import { Edit, Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { AdminCourse } from "../types";

type Props = {
  courses: AdminCourse[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleStatus: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
};

export function AdminCoursesSection({
  courses,
  searchQuery,
  onSearchChange,
  onToggleStatus,
  onDelete,
  onCreate,
}: Props) {
  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.toLowerCase();
    return course.title.toLowerCase().includes(query) || course.instructor.toLowerCase().includes(query);
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Gestión de Cursos</h1>
          <p className="text-muted-foreground">Administra el catálogo de cursos</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Curso
        </Button>
      </div>

      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por curso o instructor..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left py-4 px-6">Curso</th>
              <th className="text-left py-4 px-6">Instructor</th>
              <th className="text-left py-4 px-6">Estudiantes</th>
              <th className="text-left py-4 px-6">Estado</th>
              <th className="text-right py-4 px-6">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((course) => (
              <tr key={course.id} className="border-b border-border hover:bg-muted/50">
                <td className="py-4 px-6">
                  <div>
                    <div className="mb-1">{course.title}</div>
                    <div className="text-sm text-muted-foreground">{course.category}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-muted-foreground">{course.instructor}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {course.students}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <button
                    onClick={() => onToggleStatus(course.id)}
                    aria-label={`${course.status === "active" ? "Desactivar" : "Activar"} curso ${course.title}`}
                    className={`px-3 py-1 rounded-full text-sm ${
                      course.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {course.status === "active" ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      aria-label={`Editar curso ${course.title}`}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => onDelete(course.id)}
                      aria-label={`Eliminar curso ${course.title}`}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCourses.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-6 text-center text-sm text-muted-foreground">
                  No hay cursos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
