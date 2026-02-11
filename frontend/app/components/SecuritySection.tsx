export function SecuritySection() {
  return (
    <section id="seguridad" className="max-w-6xl mx-auto px-4 lg:px-2 py-16">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 md:p-10 space-y-4">
        <p className="text-sm font-semibold text-sky-600">Seguridad</p>
        <h2 className="text-3xl font-semibold text-slate-900">Controles y buenas prácticas</h2>
        <p className="text-slate-600">
          Implementamos controles tecnicos y organizativos alineados con buenas prácticas de la industria
          para proteger la confidencialidad, integridad y disponibilidad de la información educativa.
        </p>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Protección de datos</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Transmisión cifrada entre cliente, backend y servicio ML.</li>
              <li>Acceso por rol con permisos diferenciados.</li>
              <li>Registro de actividad para auditoria y control.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Operación segura</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Retención limitada de datos y rotación de credenciales.</li>
              <li>Copias de seguridad controladas en entorno seguro.</li>
              <li>Plan de respuesta ante incidentes y fallos operativos.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
