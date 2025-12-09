import { Navbar } from "@/app/components/Navbar";
import { AboutSection } from "@/app/components/AboutSection";
import { ContactSection } from "@/app/components/ContactSection";
import { Footer } from "@/app/components/Footer";

interface HomePageProps {
  onNavigateToLogin: () => void;
}

export function HomePage({ onNavigateToLogin }: HomePageProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar onNavigateToLogin={onNavigateToLogin} />

      {/* Hero envolvente */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-indigo-500 to-slate-900 opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-50" />
        <div className="relative max-w-6xl mx-auto px-4 lg:px-2 grid lg:grid-cols-2 gap-10">
          <div className="space-y-6 text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
              Monitoreo pasivo de atencion en tiempo real
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Cursos en linea con seguimiento inteligente de atencion
            </h1>
            <p className="text-base md:text-lg text-slate-100/90 max-w-2xl">
              VisionClass combina vision por computadora y aprendizaje adaptativo para personalizar tu experiencia
              segun tu nivel de atencion y progreso.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onNavigateToLogin}
                className="px-5 py-3 rounded-xl bg-white text-slate-900 font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-xl transition"
              >
                Comenzar ahora
              </button>
              <button className="px-5 py-3 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition">
                Ver demo
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: "Precision", value: "98%" },
                { label: "Universidades", value: "50+" },
                { label: "Soporte", value: "24/7" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 shadow-sm backdrop-blur-sm"
                >
                  <p className="text-slate-100/80">{item.label}</p>
                  <p className="text-2xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-white shadow-2xl p-6 space-y-4 border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Analisis activo</p>
                  <p className="text-xl font-semibold text-slate-900">127 estudiantes</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                  ✓
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900 text-white px-4 py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Seguimiento ocular</p>
                  <p className="text-xl font-semibold">MediaPipe Iris + FaceMesh</p>
                </div>
                <div className="text-3xl">👁️</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-slate-500">Atencion promedio</p>
                  <p className="text-xl font-semibold text-slate-900">85%</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-slate-500">Recomendaciones IA</p>
                  <p className="text-xl font-semibold text-slate-900">Activas</p>
                </div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-4">
                <p className="text-sm text-indigo-700 font-semibold">Prueba D2R integrada</p>
                <p className="text-xs text-indigo-600">
                  Calibra el perfil atencional inicial y adapta el contenido en minutos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios cortos */}
      <section className="max-w-6xl mx-auto px-4 lg:px-2 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-600">Por que VisionClass</p>
            <h2 className="text-3xl font-semibold text-slate-900">Soluciones inteligentes para educacion</h2>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Seguimiento pasivo, privacidad como prioridad y recomendaciones en tiempo real para estudiantes,
              docentes y administradores.
            </p>
          </div>
          <button
            onClick={onNavigateToLogin}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow hover:-translate-y-0.5 hover:shadow-lg transition"
          >
            Probar ahora
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Monitoreo en vivo",
              desc: "Gaze tracking, micromovimientos y señales de atencion sin hardware extra.",
              icon: "🛰️",
            },
            {
              title: "Aprendizaje adaptativo",
              desc: "Rutas personalizadas segun atencion en PDFs, video y evaluaciones.",
              icon: "✨",
            },
            {
              title: "Insights accionables",
              desc: "Dashboards por rol y alertas tempranas para docentes y administradores.",
              icon: "📊",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-5 transition transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl mb-3">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
