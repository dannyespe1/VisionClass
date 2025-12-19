"use client";

import { LoginForm } from "@/app/login/LoginForm";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";
import { Eye, Brain, Shield, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/");
  };

  const handleLogin = (username: string) => {
    const u = username.toLowerCase();
    if (u.includes("admin")) {
      router.push("/admin");
    } else if (u.includes("prof") || u.includes("docente") || u.startsWith("teacher")) {
      router.push("/instructor");
    } else {
      // Estudiante: primero pasa por pantalla D2R / consentimiento de cámara
      router.push("/d2r");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al inicio
          </button>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl">VisionClass</h1>
            </div>

            <h2 className="text-3xl mb-2">Bienvenido</h2>
            <p className="text-gray-600">Accede a tu plataforma de aprendizaje inteligente</p>
          </div>

          <LoginForm onSuccess={handleLogin} />

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">
              ¿No tienes una cuenta?{" "}
              <a href="#contacto" onClick={handleBack} className="text-blue-600 hover:underline">
                Contacta con tu institución
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1655272427565-c64fd73298df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
            alt="Computer Vision Technology"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="mb-2">Detección Pasiva</h3>
                <p className="text-blue-100">
                  Monitoreo no invasivo de la atención estudiantil mediante tecnología de visión por computador.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="mb-2">Inteligencia Artificial</h3>
                <p className="text-blue-100">Análisis en tiempo real con algoritmos avanzados para medir atención.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="mb-2">Privacidad Garantizada</h3>
                <p className="text-blue-100">
                  Sin almacenar video, solo métricas de atención. Cumplimos normativa de datos.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <blockquote className="border-l-4 border-white/30 pl-4">
            <p className="mb-2 italic">
              La implementación de este sistema ha revolucionado nuestra forma de entender la atención en el aula.
            </p>
            <footer className="text-blue-100">Dr. María Rodríguez - Universidad Nacional</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
