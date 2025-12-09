"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AdminNavbar } from "./components/AdminNavbar";
import { AdminPanelOverview } from "./components/AdminPanelOverview";
import { AdminUsersSection } from "./components/AdminUsersSection";
import { AdminCoursesSection } from "./components/AdminCoursesSection";
import { AdminAnalyticsSection } from "./components/AdminAnalyticsSection";

type TabId = "panel" | "usuarios" | "cursos" | "analytics";

export default function AdminPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("panel");

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <AdminNavbar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-6 space-y-8">
        {activeTab === "panel" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Panel administrador</h1>
              <p className="text-sm text-slate-500">
                Supervisa usuarios, cursos y rendimiento de atención desde un solo lugar.
              </p>
            </div>
            <AdminPanelOverview />
          </div>
        )}

        {activeTab === "usuarios" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
              <p className="text-sm text-slate-500">Gestiona estudiantes, profesores y administra alertas.</p>
            </div>
            <AdminUsersSection />
          </div>
        )}

        {activeTab === "cursos" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Cursos</h1>
              <p className="text-sm text-slate-500">Revisa cursos activos, atención y acciones rápidas.</p>
            </div>
            <AdminCoursesSection />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">Indicadores clave y actividad reciente del sistema.</p>
            </div>
            <AdminAnalyticsSection />
          </div>
        )}
      </div>
    </main>
  );
}
