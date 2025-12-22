export function DocumentationSection() {
  return (
    <section id="documentacion" className="max-w-6xl mx-auto px-4 lg:px-2 py-16">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10 space-y-4">
        <p className="text-sm font-semibold text-sky-600">Documentacion</p>
        <h2 className="text-3xl font-semibold text-slate-900">Repositorio y guias tecnicas</h2>
        <p className="text-slate-600">
          Consulta la documentacion tecnica, arquitectura y guia de despliegue en el repositorio oficial.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <a
            href="https://github.com/dannyespe1/VisionClass.git"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-5 py-3 text-sm font-semibold shadow hover:bg-slate-800"
          >
            Ver repositorio en GitHub
          </a>
          <p className="text-sm text-slate-500">
            Incluye configuracion de servicios, API y flujos principales.
          </p>
        </div>
      </div>
    </section>
  );
}
