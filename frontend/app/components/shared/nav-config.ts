import type { AdminView } from "../../admin/types";
import {
  OBSERVER_ANNOTATION_ENABLED,
  STUDENT_ATTENTION_DASHBOARD_ENABLED,
  TEACHER_GROUP_DASHBOARD_ENABLED,
} from "../../lib/features";

export type StudentTabId = "inicio" | "cursos" | "estadisticas" | "alertas";
export type InstructorTabId = "inicio" | "materiales" | "estadisticas" | "observacion";
export type AppShellRole = "student" | "instructor" | "admin";

export type TabByRole = {
  student: StudentTabId;
  instructor: InstructorTabId;
  admin: AdminView;
};

export type NavItem<T extends string> = {
  id: T;
  label: string;
};

export type ProfileMode = "editable" | "logout-only";

export type AppShellConfig<R extends AppShellRole> = {
  roleLabel: string;
  mobileMenuLabel: string;
  profileMode: ProfileMode;
  getItems: () => readonly NavItem<TabByRole[R]>[];
};

type AppShellConfigMap = {
  [R in AppShellRole]: AppShellConfig<R>;
};

export const NAV_CONFIG = {
  student: {
    roleLabel: "Estudiante",
    mobileMenuLabel: "Abrir menú",
    profileMode: "editable",
    getItems: () => [
      { id: "inicio", label: "Inicio" },
      { id: "cursos", label: "Cursos" },
      {
        id: "estadisticas",
        label: STUDENT_ATTENTION_DASHBOARD_ENABLED ? "Mi evidencia" : "Estadísticas",
      },
      { id: "alertas", label: "Alertas" },
    ],
  },
  instructor: {
    roleLabel: "Profesor",
    mobileMenuLabel: "Abrir menu",
    profileMode: "editable",
    getItems: () => [
      { id: "inicio", label: "Inicio" },
      { id: "materiales", label: "Materiales" },
      {
        id: "estadisticas",
        label: TEACHER_GROUP_DASHBOARD_ENABLED ? "Evidencia grupal" : "Estadisticas",
      },
      ...(OBSERVER_ANNOTATION_ENABLED
        ? ([{ id: "observacion", label: "Observación" }] as const)
        : []),
    ],
  },
  admin: {
    roleLabel: "Administrador",
    mobileMenuLabel: "Abrir menu",
    profileMode: "logout-only",
    getItems: () => [
      { id: "inicio", label: "Inicio" },
      { id: "usuarios", label: "Usuarios" },
      { id: "cursos", label: "Cursos" },
      { id: "analytics", label: "Analytics" },
    ],
  },
} satisfies AppShellConfigMap;

export function getNavConfig<R extends AppShellRole>(role: R): AppShellConfig<R> {
  return NAV_CONFIG[role] as AppShellConfig<R>;
}
