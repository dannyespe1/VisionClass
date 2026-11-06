"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { finalCta } from "./content";

export function FinalCTA() {
  return (
    <section id="evaluacion" className="scroll-mt-16 bg-white py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-[0_24px_70px_rgba(79,70,229,0.22)] sm:px-10 md:py-16">
          <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            {finalCta.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
            {finalCta.description}
          </p>
          <Link
            href={finalCta.href}
            onClick={() => {
              // TODO(landing-v2): reemplazar por canal institucional real
              // cuando esté confirmado (evaluacion@atendynex.com o formulario).
            }}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {finalCta.button}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-5 text-xs text-white/80 sm:text-sm">{finalCta.note}</p>
        </div>
      </div>
    </section>
  );
}
