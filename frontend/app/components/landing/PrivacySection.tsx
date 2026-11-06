import Link from "next/link";
import { ArrowRight, BarChart3, Shield, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { privacy } from "./content";

const privacyIcons: LucideIcon[] = [Shield, UserCheck, BarChart3];

export function PrivacySection() {
  return (
    <section id="privacidad" className="scroll-mt-16 bg-aten-bg-dark py-12 text-white md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="[&_h2]:text-white [&_p]:text-slate-300 [&_span]:text-aten-secondary-dark">
          <SectionHeader
            eyebrow={privacy.eyebrow}
            title={privacy.title}
            subtitle={privacy.description}
          />
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {privacy.cards.map((card, index) => {
            const Icon = privacyIcons[index];
            return (
              <article key={card.title} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-aten-secondary-dark">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
              </article>
            );
          })}
        </div>

        <Link
          href={privacy.href}
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-aten-secondary-dark transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aten-secondary-dark"
        >
          {privacy.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
