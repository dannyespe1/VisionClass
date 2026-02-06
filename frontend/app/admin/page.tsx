"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AdminNavbar } from "./components/AdminNavbar";
import { AdminPanelOverview } from "./components/AdminPanelOverview";
import { AdminUsersSection } from "./components/AdminUsersSection";
import { AdminCoursesSection } from "./components/AdminCoursesSection";
import { AdminAnalyticsSection } from "./components/AdminAnalyticsSection";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { apiFetch } from "../lib/api";
import type {
  AdminAnalyticsData,
  AdminCourse,
  AdminUser,
  AdminView,
  PrivacyPolicySetting,
  ResearchPermission,
} from "./types";

export default function AdminPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<AdminView>("inicio");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "estudiante" as AdminUser["role"],
    status: "active" as AdminUser["status"],
    password: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "estudiante" as AdminUser["role"],
    status: "active" as AdminUser["status"],
    password: "",
  });
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalProfessors: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalEnrollments: 0,
  });

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  const loadOverview = async (accessToken: string) => {
    const data = await apiFetch<{
      total_users: number;
      total_students: number;
      total_professors: number;
      total_courses: number;
      active_courses: number;
      total_enrollments: number;
    }>("/api/admin/overview/", {}, accessToken);
    setOverview({
      totalUsers: data.total_users,
      totalStudents: data.total_students,
      totalProfessors: data.total_professors,
      totalCourses: data.total_courses,
      activeCourses: data.active_courses,
      totalEnrollments: data.total_enrollments,
    });
  };

  const loadUsers = async (accessToken: string, query = "") => {
    const q = query ? `search=${encodeURIComponent(query)}` : "";
    const data = await apiFetch<AdminUser[]>(`/api/admin/users/${q}`, {}, accessToken);
    setUsers(data);
  };

  const loadCourses = async (accessToken: string, query = "") => {
    const q = query ? `search=${encodeURIComponent(query)}` : "";
    const data = await apiFetch<AdminCourse[]>(`/api/admin/courses/${q}`, {}, accessToken);
    setCourses(data);
  };

  const loadAnalytics = async (accessToken: string) => {
    const data = await apiFetch<AdminAnalyticsData>("/api/admin/analytics/", {}, accessToken);
    setAnalyticsData(data);
  };

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        await Promise.all([loadOverview(token), loadUsers(token), loadCourses(token), loadAnalytics(token)]);
      } catch (err) {
        console.warn("No se pudo cargar el panel admin", err);
      }
    };
    run();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const runSearch = async () => {
      try {
        if (currentView === "usuarios") {
          await loadUsers(token, searchQuery);
        }
        if (currentView === "cursos") {
          await loadCourses(token, searchQuery);
        }
      } catch (err) {
        console.warn("No se pudo actualizar la busqueda admin", err);
      }
    };
    runSearch();
  }, [currentView, searchQuery, token]);

  const deleteUser = async () => {
    if (!token || !activeUser) return;
    try {
      await apiFetch(`/api/admin/users/${activeUser.id}/`, { method: "DELETE" }, token);
      setUsers((prev) => prev.filter((u) => u.id !== activeUser.id));
      loadOverview(token);
      setDeleteOpen(false);
      setActiveUser(null);
    } catch (err) {
      console.warn("No se pudo eliminar usuario", err);
    }
  };

  const deleteCourse = (id: number) => {
    if (!token) return;
    if (!confirm("Estas seguro de que quieres eliminar este curso")) return;
    apiFetch(`/api/admin/courses/${id}/`, { method: "DELETE" }, token)
      .then(() => setCourses((prev) => prev.filter((c) => c.id !== id)))
      .then(() => loadOverview(token))
      .catch((err) => console.warn("No se pudo eliminar curso", err));
  };

  const toggleUserStatus = (id: number) => {
    if (!token) return;
    const target = users.find((user) => user.id === id);
    if (!target) return;
    const nextStatus = target.status === "active" ? "inactive" : "active";
    apiFetch<AdminUser>(`/api/admin/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    }, token)
      .then((updated) =>
        setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...updated } : user)))
      )
      .then(() => loadOverview(token))
      .catch((err) => console.warn("No se pudo actualizar usuario", err));
  };

  const toggleCourseStatus = (id: number) => {
    if (!token) return;
    const target = courses.find((course) => course.id === id);
    if (!target) return;
    const nextStatus = target.status === "active" ? "inactive" : "active";
    apiFetch<AdminCourse>(`/api/admin/courses/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    }, token)
      .then((updated) =>
        setCourses((prev) => prev.map((course) => (course.id === id ? { ...course, ...updated } : course)))
      )
      .then(() => loadOverview(token))
      .catch((err) => console.warn("No se pudo actualizar curso", err));
  };

  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsData>({
    faculty_metrics: [],
    institutional_trend: [],
    dropout_prediction: [],
    research_permissions: [],
    privacy_policies: [],
  });

  const openCreateModal = () => {
    setFormError(null);
    setCreateForm({
      name: "",
      email: "",
      role: "estudiante",
      status: "active",
      password: "",
    });
    setCreateOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    setFormError(null);
    setActiveUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role,
      status: user.status,
      password: "",
    });
    setEditOpen(true);
  };

  const openDeleteModal = (user: AdminUser) => {
    setActiveUser(user);
    setDeleteOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!token) return;
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setFormError("Nombre, email y contrasea son obligatorios.");
      return;
    }
    try {
      const created = await apiFetch<AdminUser>(
        "/api/admin/users/",
        {
          method: "POST",
          body: JSON.stringify({
            name: createForm.name.trim(),
            email: createForm.email.trim(),
            role: createForm.role,
            status: createForm.status,
            password: createForm.password,
          }),
        },
        token
      );
      setUsers((prev) => [created, ...prev]);
      loadOverview(token);
      setCreateOpen(false);
    } catch (err) {
      console.warn("No se pudo crear usuario", err);
      setFormError("No se pudo crear el usuario.");
    }
  };

  const handleEditSubmit = async () => {
    if (!token || !activeUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setFormError("Nombre y email son obligatorios.");
      return;
    }
    const payload: Record<string, unknown> = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
      status: editForm.status,
    };
    if (editForm.password.trim()) {
      payload.password = editForm.password;
    }
    try {
      const updated = await apiFetch<AdminUser>(
        `/api/admin/users/${activeUser.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token
      );
      setUsers((prev) => prev.map((item) => (item.id === activeUser.id ? { ...item, ...updated } : item)));
      setEditOpen(false);
      setActiveUser(null);
    } catch (err) {
      console.warn("No se pudo actualizar el usuario", err);
      setFormError("No se pudo actualizar el usuario.");
    }
  };

  const handleCreateCourse = async () => {
    if (!token) return;
    const title = prompt("Titulo del curso:");
    if (!title) return;
    const category = prompt("Categoria del curso:", "General") || "General";
    const instructorEmail = prompt("Email del instructor (opcional):", "");
    try {
      const created = await apiFetch<AdminCourse>(
        "/api/admin/courses/",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            category,
            status: "active",
            instructor_email: instructorEmail || undefined,
          }),
        },
        token
      );
      setCourses((prev) => [created, ...prev]);
      loadOverview(token);
    } catch (err) {
      console.warn("No se pudo crear curso", err);
    }
  };

  const handleUpdatePolicy = async (id: number, value: string) => {
    if (!token) return;
    try {
      const updated = await apiFetch<PrivacyPolicySetting>(`/api/admin/privacy-policies/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ current_value: value }),
      }, token);
      setAnalyticsData((prev) => ({
        ...prev,
        privacy_policies: prev.privacy_policies.map((policy) =>
          policy.id === id ? { ...policy, ...updated } : policy
        ),
      }));
    } catch (err) {
      console.warn("No se pudo actualizar politica", err);
    }
  };

  const handleUpdateResearchStatus = async (id: number, statusValue: "pending" | "approved" | "rejected") => {
    if (!token) return;
    try {
      const updated = await apiFetch<ResearchPermission>(`/api/admin/research-permissions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusValue }),
      }, token);
      setAnalyticsData((prev) => ({
        ...prev,
        research_permissions: prev.research_permissions.map((item) =>
          item.id === id ? { ...item, ...updated } : item
        ),
      }));
    } catch (err) {
      console.warn("No se pudo actualizar solicitud", err);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <AdminNavbar currentView={currentView} onViewChange={setCurrentView} />

      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-6 space-y-8">
        {currentView === "inicio" && (
          <AdminPanelOverview
            totalUsers={overview.totalUsers}
            totalStudents={overview.totalStudents}
            totalProfessors={overview.totalProfessors}
            totalCourses={overview.totalCourses}
            activeCourses={overview.activeCourses}
            totalEnrollments={overview.totalEnrollments}
          />
        )}

        {currentView === "usuarios" && (
          <AdminUsersSection
            users={users}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onToggleStatus={toggleUserStatus}
            onDeleteRequest={openDeleteModal}
            onCreateRequest={openCreateModal}
            onEditRequest={openEditModal}
          />
        )}

        {currentView === "cursos" && (
          <AdminCoursesSection
            courses={courses}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onToggleStatus={toggleCourseStatus}
            onDelete={deleteCourse}
            onCreate={handleCreateCourse}
          />
        )}

        {currentView === "analytics" && (
          <AdminAnalyticsSection
            data={analyticsData}
            onUpdatePolicy={handleUpdatePolicy}
            onUpdateResearchStatus={handleUpdateResearchStatus}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
            <DialogDescription>Completa los datos del usuario y asigna su rol.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Nombre completo</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre y apellido"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@institucion.edu"
              />
            </div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, role: value as AdminUser["role"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estudiante">Estudiante</SelectItem>
                  <SelectItem value="profesor">Profesor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={createForm.status}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, status: value as AdminUser["status"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-password">Contrasea</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minimo 8 caracteres"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit}>Crear usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>Actualiza los datos, rol o contrasea del usuario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre completo</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, role: value as AdminUser["role"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estudiante">Estudiante</SelectItem>
                  <SelectItem value="profesor">Profesor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, status: value as AdminUser["status"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Nueva contrasea (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Dejar en blanco para conservar"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara al usuario {activeUser?.name || activeUser?.email || "seleccionado"}. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
