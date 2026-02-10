"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoginForm } from "@/app/login/LoginForm";
import { ImageWithFallback } from "@/app/figma/ImageWithFallback";
import { Eye, Brain, Shield, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/ui/button";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokenValue } = useAuth();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const oauthStartedRef = useRef(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [googleAuthUrl, setGoogleAuthUrl] = useState("");

  const handleBack = () => {
    router.push("/");
  };

  const routeByRole = useCallback(async (accessToken: string) => {
    const profile = await apiFetch<{ role: string; is_staff: boolean; is_superuser: boolean }>(
      "/api/me/",
      {},
      accessToken
    );
    if (profile.role === "admin" || profile.is_superuser || profile.is_staff) {
      router.push("/admin");
    } else if (profile.role === "teacher") {
      router.push("/instructor");
    } else {
      try {
        const d2rResults = await apiFetch<any[]>("/api/d2r-results/", {}, accessToken);
        if (Array.isArray(d2rResults) && d2rResults.length > 0) {
          router.push("/student");
        } else {
          router.push("/d2r");
        }
      } catch (_) {
        router.push("/student");
      }
    }
  }, [router]);

  const handleLogin = async (accessToken: string) => {
    await routeByRole(accessToken);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const resolvedRedirect = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/login`;
      setRedirectUri(resolvedRedirect);
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      
      if (!clientId) {
        console.warn("⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID no configurado. OAuth deshabilitado.");
        setOauthError("Google OAuth no configurado. Usa el formulario de login.");
        return;
      }
      
      if (!resolvedRedirect) {
        console.error("❌ NEXT_PUBLIC_GOOGLE_REDIRECT_URI no configurado");
        setOauthError("Configuración de OAuth incompleta.");
        return;
      }
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: resolvedRedirect,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "consent",
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      setGoogleAuthUrl(authUrl);
      console.log("✅ Google OAuth URL generada correctamente");
    } catch (error) {
      console.error("❌ Error configurando Google OAuth:", error);
      setOauthError("Error al configurar Google OAuth.");
    }
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || oauthLoading || !redirectUri || oauthStartedRef.current) return;

    const runOauth = async () => {
      oauthStartedRef.current = true;
      setOauthLoading(true);
      setOauthError(null);
      try {
        console.log("🔄 Iniciando OAuth con código:", code.substring(0, 20) + "...");
        const data = await apiFetch<{ access: string; refresh: string }>("/api/auth/google/", {
          method: "POST",
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });
        console.log("✅ Token OAuth obtenido exitosamente");
        setTokenValue(data.access);
        await routeByRole(data.access);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo autenticar con Google.";
        console.error("❌ Error en OAuth:", msg);
        setOauthError(msg);
        // Reset para reintentar
        oauthStartedRef.current = false;
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
            {oauthError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                {oauthError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs uppercase tracking-[0.25em] text-gray-400">o</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md disabled:opacity-50"
              disabled={!googleAuthUrl || oauthLoading || !!oauthError}
              onClick={() => {
                if (!googleAuthUrl) {
                  setOauthError("Google OAuth no configurado.");
                  return;
                }
                window.location.href = googleAuthUrl;
              }}
              title={!googleAuthUrl ? "Google OAuth no configurado" : "Continuar con Google"}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <img src="/google-new.svg" alt="Google" className="h-5 w-5" />
                </span>
                <span>{oauthLoading ? "Conectando con Google..." : "Continuar con Google"}</span>
              </div>
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">
              No tienes una cuenta{" "}
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
                  Monitoreo no invasivo de la atención estudiantil mediante tecnología de visión por computadora.
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
                <p className="text-blue-100">Sin almacenar video, solo métricas de atención.</p>
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
