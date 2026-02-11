"use client";

import { Navbar } from "@/app/components/Navbar";
import { Footer } from "@/app/components/Footer";

export default function DocumentacionPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar onNavigateToLogin={() => (window.location.href = "/login")} />

      <section className="pt-28 pb-14 px-4 lg:px-2">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-sky-600">Documentación</p>
          <h1 className="text-4xl md:text-5xl font-semibold mt-2">
            Recursos técnicos de VisionClass
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            Accede a la documentación técnica, arquitectura y guías de despliegue para el
            ecosistema VisionClass.
          </p>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Repositorio oficial</h2>
            <p className="text-sm text-slate-600">
              El repositorio incluye instalación, configuración de servicios, endpoints y flujos
              principales para frontend, backend y servicio ML.
            </p>
            <a
              href="https://github.com/dannyespe1/VisionClass.git"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-5 py-3 text-sm font-semibold shadow hover:bg-slate-800"
            >
              Ver repositorio en GitHub
            </a>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Guía rápida</h2>
            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>Clonar el repositorio y levantar contenedores Docker.</li>
              <li>Configurar variables de entorno para backend y ML.</li>
              <li>Ejecutar migraciones y crear usuarios de prueba.</li>
              <li>Verificar flujos de estudiante, docente y administrador.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-2 pb-20">
        <div className="max-w-5xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 space-y-4">
          <h2 className="text-2xl font-semibold">Soporte tecnico</h2>
          <p className="text-sm text-slate-200">
            Si necesitas asistencia adicional, abre un issue en GitHub con el detalle del flujo
            y capturas de error. Responderemos con recomendaciones tecnicos.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
