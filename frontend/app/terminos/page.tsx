"use client";

import { Navbar } from "@/app/components/Navbar";
import { Footer } from "@/app/components/Footer";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar onNavigateToLogin={() => (window.location.href = "/login")} />

      <section className="pt-28 pb-14 px-4 lg:px-2">
        <div className="max-w-5xl mx-auto">
          <div className="text-sm font-semibold text-sky-600">Términos de uso</div>
          <h1 className="text-4xl md:text-5xl font-semibold mt-2">
            Condiciones de uso del servicio
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            Estos términos definen las condiciones para el uso de VisionClass por estudiantes,
            docentes e instituciones educativas.
          </p>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Uso permitido</h2>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Acceso al contenido educativo y evaluaciones.</li>
              <li>Monitoreo de atención solo con consentimiento expreso.</li>
              <li>Uso interno institucional para mejora académica.</li>
              <li>Prohibicion de uso malicioso o no autorizado.</li>
            </ul>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Consentimiento y datos</h2>
            <p className="text-sm text-slate-600">
              Al activar la cámara, el usuario acepta el tratamiento de métricas de atención para
              fines académicos. La institución es responsable de informar y validar el consentimiento
              de sus usuarios finales.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Los datos se usan para personalizar el aprendizaje.</li>
              <li>Las métricas se comparten por rol (estudiante, docente, admin).</li>
              <li>El usuario puede revocar permisos en cualquier momento.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-20">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl font-semibold">Responsabilidades</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Usuario</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Proteger sus credenciales y accesos.</li>
                <li>Usar el servicio de forma legitima.</li>
                <li>Actualizar datos personales cuando sea necesario.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Institución</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Definir políticas internas de privacidad y uso.</li>
                <li>Garantizar el consentimiento de sus usuarios.</li>
                <li>Supervisar el uso de reportes y analitica.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
