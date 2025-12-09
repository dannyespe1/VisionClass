"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

type TabId = "panel" | "usuarios" | "cursos" | "analytics";

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function AdminNavbar({ activeTab, onTabChange }: Props) {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: "panel", label: "Panel" },
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
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              VC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">VisionClass</p>
              <p className="text-[11px] text-slate-500">Panel admin</p>
            </div>
          </div>
        </div>

        <nav
          className={`${
            open ? "flex" : "hidden"
          } md:flex items-center gap-2 bg-slate-50 md:bg-transparent px-2 md:px-0 py-2 md:py-0 rounded-2xl`}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onTabChange(tab.id);
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
