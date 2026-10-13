import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Visión Atencional - Plataforma",
  description:
    "Sistema de monitoreo de atención estudiantil con visión por computador y cursos adaptativos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={plusJakarta.variable}>
        <Providers>
          {/* ELIMINADO: Header y navegación */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
