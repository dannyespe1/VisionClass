"use client";

import { useEffect, useState } from "react";
import { Bell, MailCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type NotificationItem = {
  id: number;
  subject: string;
  message: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
  sent_at: string | null;
  sender: { first_name: string; last_name: string; email: string; username: string };
  course: { title: string };
};

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-EC");
};

const formatSender = (sender: NotificationItem["sender"]) => {
  if (!sender) return "Docente";
  const full = `${sender.first_name || ""} ${sender.last_name || ""}`.trim();
  return full || sender.email || sender.username || "Docente";
};

export function AlertasSection() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<NotificationItem[]>("/api/student-notifications/", {}, token);
        setItems(data || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudieron cargar las alertas.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg">Alertas y notificaciones</h2>
            <p className="text-sm text-slate-600">
              Mensajes de tus docentes sobre tu rendimiento.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base">{item.subject}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {formatSender(item.sender)}  {formatDate(item.sent_at || item.created_at)}
                </p>
                {item.course && item.course.title && (
                  <p className="text-xs text-slate-500 mt-1">Curso: {item.course.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MailCheck className="w-4 h-4" />
                {item.status === "sent" ? "Enviado" : item.status === "failed" ? "Fallido" : "Pendiente"}
              </div>
            </div>
            <p className="text-sm text-slate-700 mt-3 whitespace-pre-line">{item.message}</p>
          </div>
        ))}

        {!items.length && !loading && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            No tienes alertas nuevas por ahora.
          </div>
        )}
        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            Cargando alertas...
          </div>
        )}
      </div>
    </div>
  );
}
