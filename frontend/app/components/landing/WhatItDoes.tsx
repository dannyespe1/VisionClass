import { CheckCircle2, XCircle } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { whatItDoes } from "./content";

export function WhatItDoes() {
  return (
    <section id="que-hace" className="scroll-mt-16 bg-white py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={whatItDoes.eyebrow} title={whatItDoes.title} align="center" />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-bold text-foreground">{whatItDoes.doesTitle}</h3>
            </div>
            <ul className="mt-6 space-y-4">
              {whatItDoes.does.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-muted/40 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <XCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-bold text-foreground">{whatItDoes.doesNotTitle}</h3>
            </div>
            <ul className="mt-6 space-y-4">
              {whatItDoes.doesNot.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="mx-auto mt-8 max-w-4xl text-center text-sm leading-6 text-muted-foreground sm:text-base">
          {whatItDoes.closing}
        </p>
      </div>
    </section>
  );
}
