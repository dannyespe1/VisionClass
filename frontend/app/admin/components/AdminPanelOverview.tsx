export function AdminPanelOverview() {
  const cards = [
    { label: "Usuarios totales", value: "1,240", desc: "Crecimiento 12% mes a mes", accent: "bg-sky-50 text-sky-700" },
    { label: "Cursos activos", value: "48", desc: "8 nuevos este mes", accent: "bg-emerald-50 text-emerald-700" },
    { label: "Sesiones monitoreadas", value: "6,320", desc: "Atención promedio 82%", accent: "bg-indigo-50 text-indigo-700" },
    { label: "Alertas pendientes", value: "12", desc: "Revisión docente requerida", accent: "bg-amber-50 text-amber-700" },
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 flex flex-col gap-2 transition transform hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="text-xs font-medium px-2 py-1 rounded-full w-fit uppercase tracking-wide {card.accent}">
              <span className={card.accent}>{card.desc}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Resumen de atención</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• 85% de cursos con atención media ≥ 80%</li>
            <li>• 12 alertas de baja atención en las últimas 24h</li>
            <li>• 3 cursos con tendencia descendente que requieren revisión</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-indigo-700 text-white rounded-3xl shadow-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold">Prueba D2R y calibración</h3>
          <p className="text-sm text-slate-100">
            Programa recordatorios para recalibrar perfiles atencionales y mantener la precisión del modelo.
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-semibold">Programar test</button>
            <button className="px-4 py-2 rounded-xl border border-white/40 text-white text-sm font-semibold hover:bg-white/10">
              Ver agenda
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
