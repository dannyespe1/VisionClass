import { NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:9000";
const TIMEOUT_MS = 2500;

export async function POST(req: Request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const formData = await req.formData();
    const target = `${ML_SERVICE_URL}/analyze/frame`;

    const res = await fetch(target, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, detail: data?.detail || "ML service error" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy error";
    // No romper el flujo del test; responder 200 con ok:false
    return NextResponse.json({ ok: false, detail: message }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
