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
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg">Alertas y notificaciones</h2>
            <p className="text-sm text-muted-foreground">
              Mensajes de tus docentes sobre tu actividad académica.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base">{item.subject}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSender(item.sender)}  {formatDate(item.sent_at || item.created_at)}
                </p>
                {item.course && item.course.title && (
                  <p className="mt-1 text-xs text-muted-foreground">Curso: {item.course.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MailCheck className="w-4 h-4" />
                {item.status === "sent" ? "Enviado" : item.status === "failed" ? "Fallido" : "Pendiente"}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-foreground">{item.message}</p>
          </div>
        ))}

        {!items.length && !loading && (
          <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            No tienes alertas nuevas por ahora.
          </div>
        )}
        {loading && (
          <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            Cargando alertas…
          </div>
        )}
      </div>
    </div>
  );
}
