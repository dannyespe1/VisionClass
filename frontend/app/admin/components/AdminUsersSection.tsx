export function AdminUsersSection() {
  const roles = [
    { role: "Estudiantes", total: 980, active: 860, attention: "82%", badge: "bg-sky-50 text-sky-700" },
    { role: "Profesores", total: 110, active: 95, attention: "79%", badge: "bg-emerald-50 text-emerald-700" },
    { role: "Admins", total: 8, active: 8, attention: "—", badge: "bg-indigo-50 text-indigo-700" },
  ];

  const alerts = [
    { name: "estudiante45", course: "ML Básico", reason: "Atención <60% 2 sesiones", action: "Notificar docente" },
    { name: "estudiante12", course: "Python", reason: "Sin completar D2R", action: "Recordar test" },
    { name: "profesor3", course: "DL Avanzado", reason: "Sin subir material semana 3", action: "Solicitar material" },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Usuarios</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <div
            key={r.role}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex flex-col gap-2 transition transform hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{r.role}</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.badge}`}>Activos {r.active}</span>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{r.total}</p>
            <p className="text-xs text-slate-500">Atención promedio: {r.attention}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Alertas recientes</h3>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            {alerts.length} pendientes
          </span>
        </div>
        <div className="space-y-3">
          {alerts.map((a, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">
                  {a.course} · {a.reason}
                </p>
              </div>
              <button className="text-xs font-semibold text-slate-700 rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-100">
                {a.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
