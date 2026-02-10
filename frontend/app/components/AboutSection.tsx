import { Eye, Brain, Shield, Zap, Users, BarChart3 } from "lucide-react";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";

export function AboutSection() {
  const features = [
    {
      icon: Eye,
      title: "Seguimiento visual",
      description: "Monitoreo de atención con vision por computadora para mejorar la concentración.",
    },
    {
      icon: Brain,
      title: "Aprendizaje adaptativo",
      description: "Contenido que se ajusta a tu ritmo y nivel de comprension.",
    },
    {
      icon: Shield,
      title: "Privacidad garantizada",
      description: "Datos protegidos con los estandares más altos de seguridad.",
    },
    {
      icon: Zap,
      title: "Retroalimentacion inmediata",
      description: "Progreso y areas de mejora en tiempo real.",
    },
    {
      icon: Users,
      title: "Comunidad activa",
      description: "Conecta con estudiantes y profesores de todo el mundo.",
    },
    {
      icon: BarChart3,
      title: "Estadisticas detalladas",
      description: "Rendimiento con métricas avanzadas y personalizadas.",
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
            Soluciones innovadoras para la educacion
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            VisionClass combina vision por computadora y IA para elevar la atención y el rendimiento en entornos
            academicos sin friccion ni hardware adicional.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-white">
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-indigo-500/10 to-transparent" />
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200"
              alt="Inteligencia Artificial"
              className="w-full h-[420px] object-cover"
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-3xl text-slate-900 font-semibold">Transformando el futuro de la educación</h3>
            <p className="text-slate-600 leading-relaxed">
              Detectamos atención de forma pasiva en tiempo real, preservando la privacidad y ofreciendo
              recomendaciones adaptativas para estudiantes, docentes y administradores.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Integración sencilla, alertas tempranas y resultados medibles para mejorar el compromiso y el
              rendimiento académico sin interrumpir la clase.
            </p>
            <div className="pt-4 grid sm:grid-cols-2 gap-3">
              {[
                "Implementación rápida en cualquier aula",
                "Soporte dedicado y mejoras continuas",
                "Resultados accionables para el equipo docente",
                "Privacidad como principio central",
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
