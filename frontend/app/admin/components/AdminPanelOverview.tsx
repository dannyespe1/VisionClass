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
        <h1 className="text-3xl mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestiona usuarios, cursos y la plataforma</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl mb-1">{totalUsers}</div>
          <div className="text-sm text-muted-foreground">Usuarios Totales</div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Activos</span>
          </div>
          <div className="text-2xl mb-1">{totalStudents}</div>
          <div className="text-sm text-muted-foreground">Estudiantes</div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl mb-1">{totalCourses}</div>
          <div className="text-sm text-muted-foreground">Cursos Totales</div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-warning" />
            </div>
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <div className="text-2xl mb-1">{totalEnrollments}</div>
          <div className="text-sm text-muted-foreground">Inscripciones</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-4">Resumen de Usuarios</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <span>Estudiantes</span>
              </div>
              <span className="text-xl">{totalStudents}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-success" />
                <span>Profesores</span>
              </div>
              <span className="text-xl">{totalProfessors}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm">
          <h3 className="text-xl mb-4">Resumen de Cursos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-success" />
                <span>Cursos Activos</span>
              </div>
              <span className="text-xl">{activeCourses}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
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
