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
  title: {
    default: "AtenDynex — Plataforma de evidencia observable de atención",
    template: "%s · AtenDynex",
  },
  description:
    "Plataforma educativa que registra evidencia observable de atención mediante visión por computador local en el navegador. Privacidad por diseño.",
  applicationName: "AtenDynex",
  keywords: [
    "atención",
    "educación",
    "evidencia observable",
    "visión por computador",
    "privacidad",
  ],
  authors: [{ name: "AtenDynex" }],
  // TODO(pr-branding): reemplazar por el dominio real antes de publicar.
  metadataBase: new URL("https://atendynex.com"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://atendynex.com",
    siteName: "AtenDynex",
    title: "AtenDynex — Plataforma de evidencia observable de atención",
    description: "Evidencia observable de atención con privacidad por diseño.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AtenDynex",
    description: "Evidencia observable de atención con privacidad por diseño.",
  },
  icons: {
    icon: "/icon.svg",
  },
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
