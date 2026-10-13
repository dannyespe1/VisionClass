import { Eye, Brain, Shield, Zap, Users, BarChart3 } from "lucide-react";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";

export function AboutSection() {
  const features = [
    {
      icon: Eye,
      title: "Seguimiento visual",
      description: "Procesamiento local de características visuales para registrar evidencia observable.",
    },
    {
      icon: Brain,
      title: "Contenido estructurado",
      description: "Contenido organizado por módulos, actividades y evaluaciones.",
    },
    {
      icon: Shield,
      title: "Privacidad por diseño",
      description: "Controles de minimización, consentimiento y procesamiento local.",
    },
    {
      icon: Zap,
      title: "Actividad registrada",
      description: "Consulta de actividad y resultados conforme se registran.",
    },
    {
      icon: Users,
      title: "Acceso por roles",
      description: "Acceso diferenciado para estudiantes, docentes, observadores e investigadores.",
    },
    {
      icon: BarChart3,
      title: "Resúmenes académicos",
      description: "Resúmenes de progreso y resultados de evaluaciones.",
    },
  ];

  return (
    <section id="nosotros" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="px-4 py-2 bg-sky-50 text-sky-700 rounded-full text-sm inline-block mb-4 border border-sky-100">
            Nosotros
          </span>
          <h2 className="text-4xl lg:text-5xl text-slate-900 mb-4 font-semibold">
            Evidencia observable para contextos educativos
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            AtenDynex combina procesamiento visual local y registros académicos para apoyar el estudio de evidencia
            observable.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-white">
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-indigo-500/10 to-transparent" />
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200"
              alt="Inteligencia Artificial"
              className="w-full h-64 sm:h-80 lg:h-[420px] object-cover"
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-3xl text-slate-900 font-semibold">Señales observables e inferencias</h3>
            <p className="text-slate-600 leading-relaxed">
              Derivamos señales observables localmente y generamos inferencias con estados de incertidumbre para
              revisión autorizada.
            </p>
            <p className="text-slate-600 leading-relaxed">
              La plataforma permite contrastar inferencias, anotaciones humanas y resultados académicos dentro del
              protocolo aprobado.
            </p>
            <div className="pt-4 grid sm:grid-cols-2 gap-3">
              {[
                "Despliegue web en equipos compatibles",
                "Guía de implementación",
                "Resultados para interpretación humana",
                "Minimización y procesamiento local",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs">
                    
                  </div>
                  <p className="text-slate-700 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl text-slate-900 mb-2 font-semibold">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
