"use client";

import { Navbar } from "@/app/components/Navbar";
import { Footer } from "@/app/components/Footer";

export default function SeguridadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar onNavigateToLogin={() => (window.location.href = "/login")} />

      <section className="pt-28 pb-14 px-4 lg:px-2">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-sky-600">Seguridad</p>
          <h1 className="text-4xl md:text-5xl font-semibold mt-2">
            Controles y protección empresarial
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            Nuestra infraestructura prioriza la confidencialidad, integridad y disponibilidad de la
            información académica, alineada a buenas prácticas de seguridad.
          </p>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Seguridad tecnica</h2>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Cifrado en transito entre cliente, backend y servicio ML.</li>
              <li>Autenticación JWT y control de acceso por roles.</li>
              <li>Registro de actividad y trazabilidad de acciones.</li>
              <li>Protección de endpoints críticos y validación de datos.</li>
            </ul>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Operacion segura</h2>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Retención limitada de datos y borrado seguro.</li>
              <li>Backups controlados y restauración planificada.</li>
              <li>Monitoreo de disponibilidad y alertas preventivas.</li>
              <li>Separación de entornos y configuración por permisos.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-20">
        <div className="max-w-5xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 space-y-4">
          <h2 className="text-2xl font-semibold">Compromiso continuo</h2>
          <p className="text-sm text-slate-200">
            Actualizamos controles y políticas para mantener el cumplimiento normativo y
            reducir riesgos operativos. Recomendamos mantener credenciales seguras y
            revisar los permisos periódicamente.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
