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
const ML_BFF_SERVICE_TOKEN = process.env.ML_BFF_SERVICE_TOKEN || "";

export async function POST(req: Request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      console.error("[attention-proxy] ❌ Token no proporcionado");
      return NextResponse.json({ ok: false, detail: "Token requerido" }, { status: 200 });
    }

    const meRes = await fetch(`${BACKEND_URL}/api/me/`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!meRes.ok) {
      console.error("[attention-proxy] ❌ Token inválido", meRes.status);
      return NextResponse.json({ ok: false, detail: "Token inválido" }, { status: 200 });
    }
    const meData = await meRes.json().catch(() => null);
    if (!meData || meData.role !== "student") {
      console.error("[attention-proxy] Rol no permitido");
      return NextResponse.json({ ok: false, detail: "Rol no permitido" }, { status: 200 });
    }

    const formData = await req.formData();
    const claimedUserId = formData.get("user_id");
    if (claimedUserId && String(claimedUserId) !== String(meData.id)) {
      return NextResponse.json({ ok: false, detail: "Identidad discordante" }, { status: 403 });
    }
    const sessionId = formData.get("session_id");
    const d2rSessionId = formData.get("d2r_session_id");
    const sessionPath = sessionId
      ? `/api/sessions/${sessionId}/`
      : d2rSessionId
        ? `/api/d2r-sessions/${d2rSessionId}/`
        : "";
    if (!sessionPath) {
      return NextResponse.json({ ok: false, detail: "Sesión requerida" }, { status: 400 });
    }
    const sessionRes = await fetch(`${BACKEND_URL}${sessionPath}`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!sessionRes.ok) {
      return NextResponse.json({ ok: false, detail: "Sesión no autorizada" }, { status: 403 });
    }
    const sessionData = await sessionRes.json();
    const sessionUserId = sessionData.student?.id ?? sessionData.user?.id;
    if (String(sessionUserId) !== String(meData.id)) {
      return NextResponse.json({ ok: false, detail: "Sesión no autorizada" }, { status: 403 });
    }
    const claimedCourseId = formData.get("course_id");
    if (claimedCourseId && sessionData.course?.id && String(claimedCourseId) !== String(sessionData.course.id)) {
      return NextResponse.json({ ok: false, detail: "Curso discordante" }, { status: 403 });
    }
    const consentRes = await fetch(`${BACKEND_URL}/api/consents/status/`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const consent = await consentRes.json().catch(() => null);
    if (!consentRes.ok || consent?.capture_allowed !== true) {
      return NextResponse.json(
        { ok: false, detail: "Consentimiento ausente, vencido o revocado" },
        { status: 403 },
      );
    }
    if (ML_BFF_SERVICE_TOKEN.length < 32) {
      console.error("[attention-proxy] Identidad de servicio no configurada");
      return NextResponse.json(
        { ok: false, detail: "Procesamiento no disponible" },
        { status: 503 },
      );
    }
    formData.delete("user_id");
    formData.set("idempotency_key", crypto.randomUUID());
    const target = `${ML_SERVICE_URL}/analyze/frame`;
    
    console.log("[attention-proxy] Envío autorizado a ML");

    const res = await fetch(target, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Service ${ML_BFF_SERVICE_TOKEN}` },
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[attention-proxy] ML Service rechazó la solicitud", res.status);
      return NextResponse.json(
        { ok: false, detail: data.detail || "ML service error" },
        { status: 200 }
      );
    }

    console.log("[attention-proxy] Solicitud ML completada");
    return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy error";
    
    // Detectar timeout específicamente
    if (message.includes("abort")) {
      console.error("[attention-proxy] ❌ Timeout esperando respuesta del ML Service (5000ms)");
      return NextResponse.json(
        { 
          ok: false, 
          detail: "Procesamiento temporalmente no disponible"
        }, 
        { status: 200 }
      );
    }
    
    console.error("[attention-proxy] Error de transporte");
    return NextResponse.json({ ok: false, detail: "Procesamiento no disponible" }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}

// Endpoint de healthcheck para verificar si el ML Service está disponible
export async function GET() {
  try {
    console.log("[attention-proxy/health] 🔄 Verificando disponibilidad de ML Service");
    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (res?.ok) {
      console.log("[attention-proxy/health] ✅ ML Service disponible");
      return NextResponse.json({ 
        ok: true, 
        message: "ML Service is available"
      });
    }

    console.error("[attention-proxy/health] ❌ ML Service no responde");
    return NextResponse.json(
      { 
        ok: false, 
        message: "ML Service is not responding",
      },
      { status: 503 }
    );
  } catch {
    console.error("[attention-proxy/health] Error verificando ML Service");
    return NextResponse.json(
      { 
        ok: false,
        message: "Could not verify ML Service",
      },
      { status: 503 }
    );
  }
}

