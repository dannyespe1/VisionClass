"use client";

import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "@/app/login/LoginForm";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";
import { Eye, Brain, Shield, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/ui/button";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokenValue } = useAuth();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [googleAuthUrl, setGoogleAuthUrl] = useState("");

  const handleBack = () => {
    router.push("/");
  };

  const routeByRole = useCallback(async (accessToken: string) => {
    const profile = await apiFetch<{ role?: string; is_staff?: boolean; is_superuser?: boolean }>(
      "/api/me/",
      {},
      accessToken
    );
    if (profile?.role === "admin" || profile?.is_superuser || profile?.is_staff) {
      router.push("/admin");
    } else if (profile?.role === "teacher") {
      router.push("/instructor");
    } else {
      router.push("/d2r");
    }
  }, [router]);

  const handleLogin = async (accessToken: string) => {
    await routeByRole(accessToken);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const resolvedRedirect = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/login`;
    setRedirectUri(resolvedRedirect);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    if (!clientId || !resolvedRedirect) return;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: resolvedRedirect,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "consent",
    });
    setGoogleAuthUrl(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || oauthLoading || !redirectUri) return;

    const runOauth = async () => {
      setOauthLoading(true);
      setOauthError(null);
      try {
        const data = await apiFetch<{ access: string; refresh: string }>("/api/auth/google/", {
          method: "POST",
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });
        setTokenValue(data.access);
        await routeByRole(data.access);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo autenticar con Google.";
        setOauthError(msg);
      } finally {
        setOauthLoading(false);
      }
    };

    runOauth();
  }, [oauthLoading, redirectUri, routeByRole, searchParams, setTokenValue]);

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

          <div className="mt-6 space-y-3">
            {oauthError && <p className="text-sm text-red-600">{oauthError}</p>}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!googleAuthUrl || oauthLoading}
              onClick={() => {
                if (!googleAuthUrl) return;
                window.location.href = googleAuthUrl;
              }}
            >
              {oauthLoading ? "Conectando con Google..." : "Continuar con Google"}
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">
              No tienes una cuenta?{" "}
              <a href="#contacto" onClick={handleBack} className="text-blue-600 hover:underline">
                Contacta con tu institucion
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
                <h3 className="mb-2">Deteccion Pasiva</h3>
                <p className="text-blue-100">
                  Monitoreo no invasivo de la atencion estudiantil mediante tecnologia de vision por computadora.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="mb-2">Inteligencia Artificial</h3>
                <p className="text-blue-100">Analisis en tiempo real con algoritmos avanzados para medir atencion.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="mb-2">Privacidad Garantizada</h3>
                <p className="text-blue-100">Sin almacenar video, solo metricas de atencion.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <blockquote className="border-l-4 border-white/30 pl-4">
            <p className="mb-2 italic">
              La implementacion de este sistema ha revolucionado nuestra forma de entender la atencion en el aula.
            </p>
            <footer className="text-blue-100">Dr. Maria Rodriguez - Universidad Nacional</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
