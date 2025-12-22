"use client";

import { BookOpen, Eye, TrendingUp, UserCheck, Users } from "lucide-react";

type Props = {
  totalUsers: number;
  totalStudents: number;
  totalProfessors: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
};

export function AdminPanelOverview({
  totalUsers,
  totalStudents,
  totalProfessors,
  totalCourses,
  activeCourses,
  totalEnrollments,
}: Props) {
  const inactiveCourses = Math.max(totalCourses - activeCourses, 0);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl mb-2">Panel de Administracion</h1>
        <p className="text-slate-600">Gestiona usuarios, cursos y la plataforma</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{totalUsers}</div>
          <div className="text-sm text-slate-600">Usuarios Totales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-slate-600">Activos</span>
          </div>
          <div className="text-2xl mb-1">{totalStudents}</div>
          <div className="text-sm text-slate-600">Estudiantes</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{totalCourses}</div>
          <div className="text-sm text-slate-600">Cursos Totales</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-sm text-slate-600">Total</span>
          </div>
          <div className="text-2xl mb-1">{totalEnrollments}</div>
          <div className="text-sm text-slate-600">Inscripciones</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-4">Resumen de Usuarios</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Estudiantes</span>
              </div>
              <span className="text-xl">{totalStudents}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-green-600" />
                <span>Profesores</span>
              </div>
              <span className="text-xl">{totalProfessors}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-4">Resumen de Cursos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span>Cursos Activos</span>
              </div>
              <span className="text-xl">{activeCourses}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-slate-600" />
                <span>Cursos Inactivos</span>
              </div>
              <span className="text-xl">{inactiveCourses}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
