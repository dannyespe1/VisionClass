import { Hero } from "@/app/components/landing/Hero";
import { LandingFooter } from "@/app/components/landing/LandingFooter";
import { LandingHeader } from "@/app/components/landing/LandingHeader";

export default function Page() {
  return (
    <>
      <a
        href="#contenido-principal"
        className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-aten-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <LandingHeader />
      <main id="contenido-principal">
        <Hero />
        {/* Las secciones informativas de Landing v2 se incorporarán en PR B. */}
      </main>
      <LandingFooter />
    </>
  );
}
