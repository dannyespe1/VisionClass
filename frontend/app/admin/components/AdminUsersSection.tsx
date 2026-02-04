"use client";

import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { AdminUser } from "../types";

type Props = {
  users: AdminUser[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleStatus: (id: number) => void;
  onDeleteRequest: (user: AdminUser) => void;
  onCreateRequest: () => void;
  onEditRequest: (user: AdminUser) => void;
};

export function AdminUsersSection({
  users,
  searchQuery,
  onSearchChange,
  onToggleStatus,
  onDeleteRequest,
  onCreateRequest,
  onEditRequest,
}: Props) {
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Gestion de Usuarios</h1>
          <p className="text-slate-600">Administra usuarios y roles</p>
        </div>
        <Button onClick={onCreateRequest}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-4 px-6">Usuario</th>
              <th className="text-left py-4 px-6">Rol</th>
              <th className="text-left py-4 px-6">Cursos</th>
              <th className="text-left py-4 px-6">Estado</th>
              <th className="text-right py-4 px-6">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-6">
                  <div>
                    <div className="mb-1">{user.name}</div>
                    <div className="text-sm text-slate-600">{user.email}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      user.role === "admin"
                         "bg-purple-100 text-purple-700"
                        : user.role === "profesor"
                         "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {user.role === "admin" ? "Admin" : user.role === "profesor" ? "Profesor" : "Estudiante"}
                  </span>
                </td>
                <td className="py-4 px-6">{user.courses}</td>
                <td className="py-4 px-6">
                  <button
                    onClick={() => onToggleStatus(user.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      user.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.status === "active" ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEditRequest.(user)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => onDeleteRequest(user)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-6 text-center text-sm text-slate-500">
                  No hay usuarios que coincidan con la busqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
