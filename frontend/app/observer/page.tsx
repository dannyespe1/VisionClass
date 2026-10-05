"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ObserverPanel } from "../components/ObserverPanel";
import { useAuth } from "../context/AuthContext";
import { OBSERVER_ANNOTATION_ENABLED } from "../lib/features";

export default function ObserverPage() {
  const router = useRouter();
  const { token, logout } = useAuth();

  useEffect(() => {
    if (!token) router.push("/login");
  }, [router, token]);

  if (!OBSERVER_ANNOTATION_ENABLED) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Panel de observación no disponible</h1>
        <p className="mt-2 text-slate-600">La función permanece cerrada hasta habilitar formalmente el piloto.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Rol independiente</p>
            <h1 className="text-3xl font-semibold">Panel del observador</h1>
            <p className="mt-1 text-sm text-slate-600">
              Observa presencialmente el código y puesto indicados. Este panel no transmite video ni muestra nombres, notas o predicciones.
            </p>
          </div>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-4 py-2"
            onClick={() => { logout(); router.push("/login"); }}
          >
            Cerrar sesión
          </button>
        </header>
        <ObserverPanel />
      </div>
    </main>
  );
}
