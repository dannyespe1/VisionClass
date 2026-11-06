import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Cpu, Globe2, LockKeyhole, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { requirements } from "./content";

const requirementIcons: LucideIcon[] = [Globe2, LockKeyhole, Camera, CheckCircle2, Cpu, Wifi];

export function RequirementsSection() {
  return (
    <section id="requisitos" className="scroll-mt-16 bg-muted/30 py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={requirements.eyebrow} title={requirements.title} />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {requirements.items.map((item, index) => {
            const Icon = requirementIcons[index];
            return (
              <div key={item} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="pt-1 text-sm leading-6 text-foreground sm:text-base">{item}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-7 text-sm text-muted-foreground sm:text-base">
          {requirements.note}{" "}
          <Link
            href={requirements.href}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Ver documentación
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}
