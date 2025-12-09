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

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "Cursos activos", value: "6", accent: "bg-sky-50 text-sky-600", icon: "📚" },
                { title: "Estudiantes", value: "180", accent: "bg-emerald-50 text-emerald-600", icon: "🧑‍🎓" },
                { title: "Promedio atencion", value: "84%", accent: "bg-indigo-50 text-indigo-600", icon: "👁️" },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg"
                >
                  <div>
                    <p className="text-xs text-slate-500">{card.title}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${card.accent}`}>{card.icon}</div>
                </div>
              ))}
            </section>

            <InicioProfesor />
          </div>
        )}

        {activeTab === "materiales" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Materiales y evaluaciones</h1>
              <p className="text-sm text-slate-500">Administra PDFs, videos y pruebas con un par de clics.</p>
            </div>
            <MaterialesSection />
          </div>
        )}

        {activeTab === "estadisticas" && (
          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Estadisticas</h1>
              <p className="text-sm text-slate-500">Analiza atencion, progreso y recomendaciones por curso.</p>
            </div>
            <EstadisticasProfesor />
            <EstadisticasProfesorAdvanced />
          </div>
        )}
      </div>
    </main>
  );
}
