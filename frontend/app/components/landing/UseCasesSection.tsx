import { BookOpenCheck, Building2, FlaskConical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { useCases } from "./content";

const useCaseIcons: LucideIcon[] = [BookOpenCheck, FlaskConical, Building2];

export function UseCasesSection() {
  return (
    <section id="casos-de-uso" className="scroll-mt-16 bg-white py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={useCases.eyebrow} title={useCases.title} align="center" />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {useCases.cards.map((card, index) => {
            const Icon = useCaseIcons[index];
            return (
              <article key={card.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-aten-secondary/10 text-aten-secondary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-foreground">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
