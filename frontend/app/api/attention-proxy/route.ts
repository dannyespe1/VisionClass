import { NextResponse } from "next/server";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL ||
  process.env.NEXT_PUBLIC_ML_URL ||
  "http://localhost:9000";
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";
const TIMEOUT_MS = 5000; // Aumentado de 2500 a 5000 ms

export async function POST(req: Request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      console.error("[attention-proxy] Token no proporcionado");
      return NextResponse.json({ ok: false, detail: "Token requerido" }, { status: 200 });
    }

    const meRes = await fetch(`${BACKEND_URL}/api/me/`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!meRes.ok) {
      console.error("[attention-proxy] Token inválido", meRes.status);
      return NextResponse.json({ ok: false, detail: "Token inválido" }, { status: 200 });
    }
    const meData = await meRes.json().catch(() => null);
    if (!meData || meData.role !== "student") {
      console.error("[attention-proxy] Rol no permitido", meData?.role);
      return NextResponse.json({ ok: false, detail: "Rol no permitido" }, { status: 200 });
    }

    const formData = await req.formData();
    const target = `${ML_SERVICE_URL}/analyze/frame`;
    
    console.log("[attention-proxy] Enviando frame a ML Service", {
      url: target,
      timeout: TIMEOUT_MS,
    });

    const res = await fetch(target, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[attention-proxy] ML Service error", {
        status: res.status,
        detail: data.detail || res.statusText,
      });
      return NextResponse.json(
        { ok: false, detail: data.detail || "ML service error" },
        { status: 200 }
      );
    }

    console.log("[attention-proxy] Frame procesado correctamente", {
      ok: data.ok,
      hasFrameScore: !!data.frame_score,
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy error";
    
    // Detectar timeout específicamente
    if (message.includes("abort")) {
      console.error("[attention-proxy] Timeout esperando respuesta del ML Service (5000ms)");
      return NextResponse.json(
        { 
          ok: false, 
          detail: "ML Service timeout - El servicio puede no estar disponible",
          service_url: ML_SERVICE_URL
        }, 
        { status: 200 }
      );
    }
    
    console.error("[attention-proxy] Error en proxy", message);
    return NextResponse.json({ ok: false, detail: message }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}

// Endpoint de healthcheck para verificar si el ML Service está disponible
export async function GET() {
  try {
    console.log("[attention-proxy/health] Verificando disponibilidad de ML Service");
    
    const res = await fetch(`${ML_SERVICE_URL}/docs`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (res?.ok) {
      console.log("[attention-proxy/health] ML Service disponible");
      return NextResponse.json({ 
        ok: true, 
        service_url: ML_SERVICE_URL,
        message: "ML Service is available"
      });
    }

    console.error("[attention-proxy/health] ML Service no responde");
    return NextResponse.json(
      { 
        ok: false, 
        service_url: ML_SERVICE_URL,
        message: "ML Service is not responding"
      },
      { status: 503 }
    );
  } catch (err) {
    console.error("[attention-proxy/health] Error verificando ML Service", err);
    return NextResponse.json(
      { 
        ok: false,
        service_url: ML_SERVICE_URL,
        message: "Could not verify ML Service"
      },
      { status: 503 }
    );
  }
}
