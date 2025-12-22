"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AdminNavbar } from "./components/AdminNavbar";
import { AdminPanelOverview } from "./components/AdminPanelOverview";
import { AdminUsersSection } from "./components/AdminUsersSection";
import { AdminCoursesSection } from "./components/AdminCoursesSection";
import { AdminAnalyticsSection } from "./components/AdminAnalyticsSection";
import { apiFetch } from "../lib/api";
import type { AdminAnalyticsData, AdminCourse, AdminUser, AdminView } from "./types";

export default function AdminPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<AdminView>("inicio");
  const [searchQuery, setSearchQuery] = useState("");
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
    const q = query ? `?search=${encodeURIComponent(query)}` : "";
    const data = await apiFetch<AdminUser[]>(`/api/admin/users/${q}`, {}, accessToken);
    setUsers(data);
  };

  const loadCourses = async (accessToken: string, query = "") => {
    const q = query ? `?search=${encodeURIComponent(query)}` : "";
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

  const deleteUser = (id: number) => {
    if (!token) return;
    if (!confirm("Estas seguro de que quieres eliminar este usuario?")) return;
    apiFetch(`/api/admin/users/${id}/`, { method: "DELETE" }, token)
      .then(() => setUsers((prev) => prev.filter((u) => u.id !== id)))
      .then(() => loadOverview(token))
      .catch((err) => console.warn("No se pudo eliminar usuario", err));
  };

  const deleteCourse = (id: number) => {
    if (!token) return;
    if (!confirm("Estas seguro de que quieres eliminar este curso?")) return;
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

  const handleCreateUser = async () => {
    if (!token) return;
    const name = prompt("Nombre completo del usuario:");
    if (!name) return;
    const email = prompt("Email del usuario:");
    if (!email) return;
    const rawRole = (prompt("Rol (estudiante/profesor):", "estudiante") || "estudiante").toLowerCase();
    const role = ["estudiante", "profesor", "admin"].includes(rawRole) ? rawRole : "estudiante";
    try {
      const created = await apiFetch<AdminUser>(
        "/api/admin/users/",
        {
          method: "POST",
          body: JSON.stringify({ name, email, role, status: "active" }),
        },
        token
      );
      setUsers((prev) => [created, ...prev]);
      loadOverview(token);
    } catch (err) {
      console.warn("No se pudo crear usuario", err);
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
      const updated = await apiFetch(`/api/admin/privacy-policies/${id}/`, {
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
      const updated = await apiFetch(`/api/admin/research-permissions/${id}/`, {
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
            onDelete={deleteUser}
            onCreate={handleCreateUser}
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
    </main>
  );
}
