import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "raw_frame_transport_disabled",
      detail: "El análisis se ejecuta localmente en el dispositivo; no se aceptan imágenes ni video.",
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, mode: "edge", raw_frame_transport: false });
}

