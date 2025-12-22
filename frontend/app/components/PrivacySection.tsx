export function PrivacySection() {
  return (
    <section id="privacidad" className="max-w-6xl mx-auto px-4 lg:px-2 py-16">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10 space-y-4">
        <p className="text-sm font-semibold text-sky-600">Privacidad</p>
        <h2 className="text-3xl font-semibold text-slate-900">Confidencialidad y proteccion de datos</h2>
        <p className="text-slate-600">
          VisionClass trata la informacion personal y academica conforme a la Ley Organica de Proteccion
          de Datos Personales del Ecuador (LOPDP). Solo recopilamos los datos necesarios para ofrecer
          la experiencia educativa y las metricas de atencion de forma segura y transparente.
        </p>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Principios aplicados</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Finalidad legitima y consentida para el analisis de atencion.</li>
              <li>Minimizacion de datos y acceso limitado por rol.</li>
              <li>Transparencia en el tratamiento y uso de la informacion.</li>
              <li>Derechos de acceso, rectificacion y eliminacion bajo solicitud.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Datos sensibles</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>No almacenamos video continuo ni audio sin autorizacion expresa.</li>
              <li>Las metricas de atencion se registran como datos anonimizados.</li>
              <li>Las imagenes de perfil son opcionales y administradas por el usuario.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
