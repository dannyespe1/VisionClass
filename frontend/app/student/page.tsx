"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { InicioSection } from "./InicioSection";
import { CursosSection } from "./CursosSection";
import { EstadisticasSection } from "./EstadisticasSection";
import { StudentNavbar } from "./StudentNavbar";

export default function StudentPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"inicio" | "cursos" | "estadisticas">("inicio");
  const [sessionId, setSessionId] = useState("");
  const [contentId, setContentId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    const loadMe = async () => {
      try {
        await apiFetch<{ id: number }>("/api/me/", {}, token);
      } catch (err) {
        console.warn("No se pudo obtener /api/me", err);
      }
    };
    loadMe();
  }, [token, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <StudentNavbar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-6 space-y-6">
        {activeTab === "inicio" && (
          <section className="space-y-3">
            <InicioSection
              onCourseSelect={(courseId) => {
                setContentId(String(courseId));
                setSelectedCourse(String(courseId));
                if (!sessionId) setSessionId("1");
                router.push(`/student/course/${courseId}`);
              }}
            />
          </section>
        )}

        {activeTab === "cursos" && (
          <section className="space-y-4">
            <CursosSection
              onCourseSelect={(courseId) => {
                setContentId(String(courseId));
                setSelectedCourse(String(courseId));
                if (!sessionId) setSessionId("1");
                router.push(`/student/course/${courseId}`);
              }}
            />
          </section>
        )}

        {activeTab === "estadisticas" && (
          <section className="space-y-4">
            <EstadisticasSection />
          </section>
        )}
      </div>
    </main>
  );
}
