"use client";

import { Navbar } from "@/app/components/Navbar";
import { Footer } from "@/app/components/Footer";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar onNavigateToLogin={() => (window.location.href = "/login")} />

      <section className="pt-28 pb-14 px-4 lg:px-2">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-sky-600">Privacidad</p>
          <h1 className="text-4xl md:text-5xl font-semibold mt-2">
            Confidencialidad y protección de datos
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            VisionClass cumple con la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador.
            Tratamos la información con finalidades legítimas, minimización de datos y transparencia.
          </p>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Principios que aplicamos</h2>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Finalidad y consentimiento informado para el análisis de atención.</li>
              <li>Minimización: recolectamos solo lo necesario para el aprendizaje.</li>
              <li>Transparencia: explicamos qué datos se usan y con qué fin.</li>
              <li>Exactitud y actualización de datos por parte del usuario.</li>
              <li>Conservación limitada y eliminación segura cuando corresponde.</li>
            </ul>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Datos y finalidad</h2>
            <p className="text-sm text-slate-600">
              Procesamos métricas de atención, progreso académico y resultados de evaluaciones para
              generar, de forma agregada, recomendaciones y reportes. No almacenamos video continuo
              ni audio por defecto.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Perfil: nombre, correo y preferencias.</li>
              <li>Sesión: tiempo de estudio, avances, atención agregada.</li>
              <li>Evaluaciones: calificaciones y retroalimentación.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-20">
        <div className="max-w-5xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 space-y-4">
          <h2 className="text-2xl font-semibold">Derechos del titular</h2>
          <p className="text-sm text-slate-200">
            Puedes solicitar acceso, rectificación, eliminación o actualización de tus datos.
            También puedes revocar permisos de cámara y analítica desde la configuración.
          </p>
          <p className="text-sm text-slate-200">
            Para consultas de privacidad escribe a soporte@visionclass.ec.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
