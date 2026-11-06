import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  MousePointer2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { hero, heroVisual } from "./content";

const signalBars = [36, 52, 44, 67, 58, 72, 63, 80, 68, 61, 74, 65];

function EvidenceVisual() {
  return (
    <div
      className="relative mx-auto min-h-[430px] w-full max-w-[590px] lg:min-h-[500px]"
      role="img"
      aria-label="Diagrama abstracto del flujo desde señales locales hasta revisión humana"
    >
      <div
        aria-hidden="true"
        className="absolute inset-3 rounded-[2rem] bg-[linear-gradient(rgba(79,70,229,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.07)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_78%)]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-aten-primary/10"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-aten-secondary/10"
      />

      <div className="absolute inset-x-3 top-14 rounded-[1.5rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_80px_rgba(30,41,59,0.16)] backdrop-blur sm:inset-x-9 sm:top-16 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[0.65rem] font-bold tracking-[0.18em] text-aten-text-muted">
              {heroVisual.sessionLabel}
            </span>
            <strong className="mt-1 block text-base text-aten-text sm:text-lg">
              {heroVisual.title}
            </strong>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-success" />
            {heroVisual.localLabel}
          </span>
        </div>

        <div className="mt-7 flex h-24 items-end gap-2 rounded-xl border border-aten-border bg-aten-bg px-4 py-3" aria-hidden="true">
          {signalBars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="min-w-1 flex-1 rounded-t-sm bg-gradient-to-t from-aten-primary to-aten-secondary opacity-80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-aten-border py-4">
          {heroVisual.metrics.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <span className="block text-[0.6rem] font-bold tracking-[0.12em] text-aten-text-muted sm:text-[0.65rem]">
                {metric.label}
              </span>
              <strong
                className={`mt-1 block truncate text-xs sm:text-sm ${
                  metric.label === "ESTADO" ? "text-amber-700" : "text-aten-text"
                }`}
              >
                {metric.value}
              </strong>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl bg-indigo-50/80 p-3.5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-aten-primary shadow-sm">
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm text-aten-text">{heroVisual.reviewTitle}</strong>
            <span className="block truncate text-xs text-aten-text-muted">
              {heroVisual.reviewSubtitle}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-aten-text-muted" aria-hidden="true" />
        </div>
      </div>

      <div className="absolute left-0 top-2 inline-flex items-center gap-2 rounded-full border border-aten-border bg-white px-3 py-2 text-xs font-semibold text-aten-text shadow-lg sm:left-2 sm:top-4">
        <ShieldCheck className="h-4 w-4 text-aten-primary" aria-hidden="true" />
        {heroVisual.privacyNote}
      </div>
      <div className="absolute bottom-2 right-0 inline-flex items-center gap-2 rounded-full border border-aten-border bg-white px-3 py-2 text-xs font-semibold text-aten-text shadow-lg sm:bottom-5 sm:right-2">
        <MousePointer2 className="h-4 w-4 text-aten-secondary" aria-hidden="true" />
        {heroVisual.consentNote}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden border-b border-aten-border bg-white"
    >
      <div
        aria-hidden="true"
        className="absolute -left-48 top-8 -z-10 h-[30rem] w-[30rem] rounded-full bg-indigo-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-48 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-cyan-100/60 blur-3xl"
      />

      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold tracking-[0.08em] text-aten-primary sm:text-sm">
            {hero.eyebrow}
          </span>
          <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-aten-text sm:text-5xl lg:text-[3.75rem]">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-aten-text-muted sm:text-lg sm:leading-8">
            {hero.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {/* TODO(landing-v2): reemplazar por canal institucional real cuando esté confirmado
                (evaluacion@atendynex.com o formulario dedicado). */}
            <Link
              href={hero.primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-aten-primary px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(79,70,229,0.24)] transition-colors hover:bg-aten-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aten-primary"
            >
              {hero.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={hero.secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-aten-border bg-white px-5 py-3.5 text-sm font-semibold text-aten-text shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aten-primary"
            >
              {hero.secondaryCta}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-aten-text-muted sm:text-sm">
            {hero.microNotes.map((note, index) => (
              <span key={note} className="inline-flex items-center gap-3">
                {index > 0 && <span className="h-1 w-1 rounded-full bg-aten-primary/50" aria-hidden="true" />}
                {note}
              </span>
            ))}
          </div>
        </div>

        <EvidenceVisual />
      </div>
    </section>
  );
}
