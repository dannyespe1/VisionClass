import { BookOpen, Eye, GraduationCap, Microscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { roles } from "./content";

const roleIcons: LucideIcon[] = [GraduationCap, BookOpen, Eye, Microscope];

export function RolesSection() {
  return (
    <section id="roles" className="scroll-mt-16 bg-white py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={roles.eyebrow} title={roles.title} align="center" />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {roles.cards.map((role, index) => {
            const Icon = roleIcons[index];
            return (
              <article key={role.title} className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-bold text-foreground">{role.title}</h3>
                </div>
                <ul className="mt-5 space-y-3">
                  {role.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-6 text-muted-foreground sm:text-base">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
