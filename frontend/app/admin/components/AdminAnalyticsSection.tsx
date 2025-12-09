export function AdminAnalyticsSection() {
  const metrics = [
    { label: "Atención promedio global", value: "82%", desc: "Últimos 7 días", accent: "bg-indigo-50 text-indigo-700" },
    { label: "Evaluaciones generadas", value: "320", desc: "Dificultad adaptativa", accent: "bg-sky-50 text-sky-700" },
    { label: "Alertas resueltas", value: "45", desc: "Últimas 24h", accent: "bg-emerald-50 text-emerald-700" },
  ];

  const logs = [
    "Modelo CNN-LSTM actualizado a v0.4 con precisión 90%",
    "Se completaron 58 pruebas D2R de recalibración",
    "Nuevos materiales publicados en 6 cursos",
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 transition transform hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-xs text-slate-500">{m.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{m.value}</p>
            <p className={`text-[11px] font-medium px-2 py-1 rounded-full w-fit ${m.accent}`}>{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Actividad reciente</h3>
        <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
          {logs.map((l, idx) => (
            <li key={idx}>{l}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
