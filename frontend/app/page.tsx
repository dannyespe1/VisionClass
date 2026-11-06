import { DocsSection } from "@/app/components/landing/DocsSection";
import { FinalCTA } from "@/app/components/landing/FinalCTA";
import { Hero } from "@/app/components/landing/Hero";
import { HowItWorks } from "@/app/components/landing/HowItWorks";
import { LandingFooter } from "@/app/components/landing/LandingFooter";
import { LandingHeader } from "@/app/components/landing/LandingHeader";
import { PrivacySection } from "@/app/components/landing/PrivacySection";
import { RequirementsSection } from "@/app/components/landing/RequirementsSection";
import { RolesSection } from "@/app/components/landing/RolesSection";
import { UseCasesSection } from "@/app/components/landing/UseCasesSection";
import { WhatItDoes } from "@/app/components/landing/WhatItDoes";

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
        <WhatItDoes />
        <HowItWorks />
        <PrivacySection />
        <RolesSection />
        <RequirementsSection />
        <UseCasesSection />
        <DocsSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </>
  );
}
