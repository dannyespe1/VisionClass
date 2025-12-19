"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { InstructorNavbar } from "./components/InstructorNavbar";
import { InicioProfesor } from "./components/InicioProfesor";
import { MaterialesSection } from "./components/MaterialesSection";
import { EstadisticasProfesor } from "./components/EstadisticasProfesor";
import { EstadisticasProfesorAdvanced } from "./components/EstadisticasProfesorAdvanced";

type TabId = "inicio" | "materiales" | "estadisticas";

export default function InstructorPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("inicio");

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <InstructorNavbar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-6 space-y-6">
        {activeTab === "inicio" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Bienvenido, profesor</h1>
              <p className="text-sm text-slate-500">
                Gestiona tus cursos, revisa la atencion de tus estudiantes y ajusta el contenido en segundos.
              </p>
            </div>
            <InicioProfesor />
          </div>
        )}

        {activeTab === "materiales" && (
          <div className="space-y-4">
            <MaterialesSection />
          </div>
        )}

        {activeTab === "estadisticas" && (
          <div className="space-y-8">
            <EstadisticasProfesor />
            <EstadisticasProfesorAdvanced />
          </div>
        )}
      </div>
    </main>
  );
}
