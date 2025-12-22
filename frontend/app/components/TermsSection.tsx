export function TermsSection() {
  return (
    <section id="terminos" className="max-w-6xl mx-auto px-4 lg:px-2 py-16">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10 space-y-4">
        <p className="text-sm font-semibold text-sky-600">Terminos de uso</p>
        <h2 className="text-3xl font-semibold text-slate-900">Condiciones de uso empresarial</h2>
        <p className="text-slate-600">
          El uso de VisionClass implica la aceptacion informada del tratamiento de datos necesarios
          para medir atencion, progreso y rendimiento. El usuario conserva el control sobre su informacion
          y puede gestionar permisos en cualquier momento.
        </p>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Alcance del servicio</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Analisis de atencion durante sesiones educativas y evaluaciones.</li>
              <li>Generacion de reportes agregados para docentes y administradores.</li>
              <li>Personalizacion del contenido segun resultados del estudiante.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Consentimiento y responsabilidades</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Se requiere consentimiento para activar camara y analitica.</li>
              <li>El usuario debe mantener la confidencialidad de sus credenciales.</li>
              <li>Las instituciones son responsables del uso conforme a sus politicas.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
