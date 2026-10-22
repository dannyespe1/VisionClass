"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LogOut, User } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import type { UserProfileApi } from "../../lib/api-types";

export function EditableProfileMenu({ role }: { role: "student" | "instructor" }) {
  const { token, logout } = useAuth();
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

  const handleLogout = () => {
    logout();
    window.location.replace("/");
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const data = await apiFetch<UserProfileApi>("/api/me/", {}, token);
        setProfileForm({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          profile_image: data.profile_image || "",
        });
        setOriginalEmail(data.email || "");
      } catch {
        setProfileError("No se pudo cargar el perfil.");
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
      const updated = await apiFetch<UserProfileApi>(
        "/api/me/",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token,
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
    } catch {
      setProfileError("No se pudo actualizar el perfil. Verifica la contraseña actual.");
    }
  };

  const initials =
    `${profileForm.first_name?.[0] || ""}${profileForm.last_name?.[0] || ""}` || "VC";
  const avatarUrl = profileForm.profile_image;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
        >
          <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold overflow-hidden">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Perfil"
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              initials
            )}
          </span>
          <span className="hidden sm:inline">{profileForm.first_name || "Perfil"}</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-card shadow-lg z-20">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
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
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-8">
          <div className="min-h-full w-full grid place-items-center">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 sm:p-7">
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl mb-2">Editar perfil</h3>
                <p className="text-sm text-muted-foreground">Actualiza tus datos y seguridad.</p>
              </div>
              <div className="space-y-4 mt-5">
                <div>
                  <label className="text-sm text-muted-foreground">Foto de perfil</label>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground text-sm">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt="Perfil"
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <label className="px-3 py-2 rounded-lg border border-border text-sm cursor-pointer hover:bg-muted">
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
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setProfileForm((prev) => ({ ...prev, profile_image: "" }))
                        }
                      >
                        Quitar imagen
                      </button>
                      {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Nombre</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 mt-1"
                    value={profileForm.first_name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Apellido</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 mt-1"
                    value={profileForm.last_name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Correo (usuario)</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2 mt-1"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Contraseña actual</label>
                  <input
                    type="password"
                    className="w-full border border-border rounded-lg px-3 py-2 mt-1"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder={
                      role === "student"
                        ? "Requerida para cambiar correo o contraseña"
                        : "Requerida para cambiar correo o contrasea"
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Nueva contraseña</label>
                  <input
                    type="password"
                    className="w-full border border-border rounded-lg px-3 py-2 mt-1"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    className="w-full border border-border rounded-lg px-3 py-2 mt-1"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>
              {profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                <button
                  className="w-full sm:w-auto px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
                  onClick={() => setProfileOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-aten-primary-hover"
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
