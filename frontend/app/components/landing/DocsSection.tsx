import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText, Github, Lock, LogIn, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { docs } from "./content";

const docIcons: LucideIcon[] = [BookOpen, Shield, Lock, FileText, LogIn, Github];

export function DocsSection() {
  return (
    <section id="recursos" className="scroll-mt-16 bg-muted/30 py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={docs.eyebrow} title={docs.title} align="center" />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.links.map((item, index) => {
            const Icon = docIcons[index];
            return (
              <Link
                key={item.title}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 font-semibold text-foreground">{item.title}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
