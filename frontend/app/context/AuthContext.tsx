"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { apiFetch } from "../lib/api";

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "jwt_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });
  const [loading] = useState(false);

  const login = async (username: string, password: string) => {
    const data = await apiFetch<{ access: string; refresh: string }>("/api/auth/token/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.access);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, data.access);
    }
  };

  const logout = () => {
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
