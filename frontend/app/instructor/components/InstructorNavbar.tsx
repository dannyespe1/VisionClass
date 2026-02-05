"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

type TabId = "inicio" | "materiales" | "estadisticas";

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function InstructorNavbar({ activeTab, onTabChange }: Props) {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    profile_image: "",
  });
  const [originalEmail, setOriginalEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const tabs: { id: TabId; label: string }[] = [
    { id: "inicio", label: "Inicio" },
    { id: "materiales", label: "Materiales" },
    { id: "estadisticas", label: "Estadisticas" },
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const data = await apiFetch<any>("/api/me/", {}, token);
        setProfileForm({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          profile_image: data.profile_image || "",
        });
        setOriginalEmail(data.email || "");
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, [token]);

  const handleProfileSave = async () => {
    if (!token) return;
    setProfileError(null);
    const emailChanged = profileForm.email !== originalEmail;
    const wantsPasswordChange = newPassword.trim().length > 0;
    const needsAuth = emailChanged || wantsPasswordChange;
    if (needsAuth && !currentPassword.trim()) {
      setProfileError("Ingresa tu contraseña actual para cambiar correo o contraseña.");
      return;
    }
    if (wantsPasswordChange && newPassword !== confirmPassword) {
      setProfileError("La nueva contraseña no coincide.");
      return;
    }
    try {
      const payload: Record<string, string> = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        profile_image: profileForm.profile_image,
      };
      if (needsAuth) {
        payload.current_password = currentPassword;
      }
      if (wantsPasswordChange) {
        payload.new_password = newPassword;
      }
      const updated = await apiFetch<any>(
        "/api/me/",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token
      );
      setProfileForm({
        username: updated.username || profileForm.username,
        first_name: updated.first_name || profileForm.first_name,
        last_name: updated.last_name || profileForm.last_name,
        email: updated.email || profileForm.email,
        profile_image: updated.profile_image || profileForm.profile_image,
      });
      setOriginalEmail(updated.email || profileForm.email);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setProfileOpen(false);
    } catch (err) {
      console.error(err);
      setProfileError("No se pudo actualizar el perfil. Verifica la contraseña actual.");
    }
  };

  const initials =
    `${profileForm.first_name?.[0] || ""}${profileForm.last_name?.[0] || ""}` || "VC";
  const avatarUrl = profileForm.profile_image;

  return (
    <>
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
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-white p-1 flex items-center justify-center">
              <img src="/LOGO1.png" alt="VisionClass" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-slate-900">VisionClass</span>
            <div className="h-8 w-px bg-slate-300" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-900">Profesor</span>
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

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Perfil" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="hidden sm:inline">{profileForm.first_name || "Perfil"}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg z-20">
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                onClick={() => {
                  setProfileError(null);
                  setProfileOpen(true);
                  setMenuOpen(false);
                }}
              >
                <User className="w-4 h-4" />
                Mi perfil
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        </div>
      </header>
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-8">
          <div className="min-h-full w-full grid place-items-center">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 sm:p-7">
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl mb-2">Editar perfil</h3>
                <p className="text-sm text-slate-500">Actualiza tus datos y seguridad.</p>
              </div>
              <div className="space-y-4 mt-5">
                <div>
                  <label className="text-sm text-slate-600">Foto de perfil</label>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-600 text-sm">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Perfil" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  <div className="flex flex-col gap-2 w-full">
                    <label className="px-3 py-2 rounded-lg border border-slate-200 text-sm cursor-pointer hover:bg-slate-50">
                      Cambiar imagen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (file.size > 1024 * 1024) {
                              setUploadError("La imagen debe pesar menos de 1MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = String(reader.result || "");
                              setProfileForm((prev) => ({ ...prev, profile_image: result }));
                              setUploadError(null);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => setProfileForm((prev) => ({ ...prev, profile_image: "" }))}
                      >
                        Quitar imagen
                      </button>
                      {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Nombre</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Apellido</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Correo (usuario)</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Contraseña actual</label>
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Requerida para cambiar correo o contrasea"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Nueva contraseña</label>
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
            </div>
            {profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                <button
                  className="w-full sm:w-auto px-5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setProfileOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                  onClick={handleProfileSave}
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
