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
              Procesamiento local de señales visuales durante la actividad educativa
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Cursos en línea con registro de evidencia observable
            </h1>
            <p className="text-base md:text-lg text-slate-100/90 max-w-2xl">
              AtenDynex organiza evidencia observable y datos de progreso para apoyar el análisis educativo.
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
              {[
                { label: "Procesamiento", value: "Local" },
                { label: "Privacidad", value: "Por diseño" },
                { label: "Soporte", value: "Documentado" },
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
                  <p className="text-xs text-slate-500">Sesiones</p>
                  <p className="text-xl font-semibold text-slate-900">Con consentimiento</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                  ✓
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900 text-white px-4 py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Procesamiento local</p>
                  <p className="text-xl font-semibold">Características faciales y oculares</p>
                </div>
                <div className="text-3xl">👁️</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-slate-500">Cobertura</p>
                  <p className="text-xl font-semibold text-slate-900">Señal observable</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-slate-500">Inferencias</p>
                  <p className="text-xl font-semibold text-slate-900">En evaluación</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios cortos */}
      <section className="max-w-6xl mx-auto px-4 lg:px-2 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-600">Por qué AtenDynex</p>
            <h2 className="text-3xl font-semibold text-slate-900">Herramientas para evidencia educativa observable</h2>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Procesamiento local, minimización de datos y resultados sujetos a revisión humana.
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
              title: "Procesamiento local",
              desc: "Características faciales y oculares derivadas localmente con una cámara compatible.",
              icon: "🛰️",
            },
            {
              title: "Contenido y progreso",
              desc: "Contenido, evaluaciones y registros de progreso organizados por curso.",
              icon: "✨",
            },
            {
              title: "Revisión por roles",
              desc: "Paneles por rol para revisar evidencia autorizada y resultados académicos.",
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
