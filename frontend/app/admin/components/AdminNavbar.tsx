"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { AdminView } from "../types";

type Props = {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
};

export function AdminNavbar({ currentView, onViewChange }: Props) {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const tabs: { id: AdminView; label: string }[] = [
    { id: "inicio", label: "Inicio" },
    { id: "usuarios", label: "Usuarios" },
    { id: "cursos", label: "Cursos" },
    { id: "analytics", label: "Analytics" },
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="w-full sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg border border-slate-200"
            onClick={() => setOpen((value) => !value)}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-white p-1 flex items-center justify-center">
              <img src="/LOGO1.png" alt="VisionClass" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-slate-900">VisionClass</span>
            <div className="h-8 w-px bg-slate-300" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-900">Administrador</span>
          </div>
        </div>

        <nav
          className={`${
            open ? "flex" : "hidden"
          } md:flex items-center gap-2 bg-slate-50 md:bg-transparent px-2 md:px-0 py-2 md:py-0 rounded-2xl`}
        >
          {tabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onViewChange(tab.id);
                  setOpen(false);
                }}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 to-indigo-700 text-white text-sm font-semibold px-3 py-2 shadow hover:shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
