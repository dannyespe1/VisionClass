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
  onCreate?: () => void;
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
          <h1 className="text-3xl mb-2">Gestion de Cursos</h1>
          <p className="text-slate-600">Administra el catalogo de cursos</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Curso
        </Button>
      </div>

      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por curso o instructor..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
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
              <tr key={course.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-6">
                  <div>
                    <div className="mb-1">{course.title}</div>
                    <div className="text-sm text-slate-600">{course.category}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-slate-600">{course.instructor}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    {course.students}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <button
                    onClick={() => onToggleStatus(course.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      course.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {course.status === "active" ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => onDelete(course.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCourses.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-6 text-center text-sm text-slate-500">
                  No hay cursos que coincidan con la busqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
