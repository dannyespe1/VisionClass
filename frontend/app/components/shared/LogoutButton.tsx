"use client";

import { LogOut } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export function LogoutButton() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.replace("/");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 to-indigo-700 text-white text-sm font-semibold px-3 py-2 shadow hover:shadow-lg transition-transform hover:-translate-y-0.5"
    >
      <LogOut className="w-4 h-4" />
      Cerrar sesión
    </button>
  );
}
