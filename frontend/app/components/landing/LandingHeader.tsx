"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { landingNavItems } from "./content";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 h-16 border-b transition-all duration-200 ${
        scrolled
          ? "border-aten-border/80 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          : "border-transparent bg-white/95"
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="AtenDynex, inicio" className="shrink-0">
          <Image
            src="/brand/atendynex-logo.svg"
            alt="AtenDynex"
            width={160}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">
          {landingNavItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-aten-text-muted transition-colors hover:text-aten-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aten-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="hidden rounded-xl bg-aten-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-aten-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aten-primary lg:inline-flex"
        >
          Ingresar
        </Link>

        <button
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-aten-border bg-white text-aten-text transition-colors hover:bg-aten-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aten-primary lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="landing-mobile-menu"
          className="fixed inset-x-0 top-16 h-[calc(100dvh-4rem)] border-t border-aten-border bg-white px-5 py-7 shadow-xl lg:hidden"
        >
          <nav className="mx-auto flex max-w-lg flex-col" aria-label="Navegación móvil">
            {landingNavItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-aten-border py-4 text-base font-semibold text-aten-text transition-colors hover:text-aten-primary focus-visible:outline-2 focus-visible:outline-aten-primary"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-7 inline-flex justify-center rounded-xl bg-aten-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-aten-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aten-primary"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
