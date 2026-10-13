import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AtenDynex";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
          color: "#FFFFFF",
          fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.02em" }}>
          AtenDynex
        </div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.9, fontWeight: 400 }}>
          Plataforma de evidencia observable de atención
        </div>
      </div>
    ),
    size,
  );
}
