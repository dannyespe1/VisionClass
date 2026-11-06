import { SectionHeader } from "./SectionHeader";
import { howItWorks } from "./content";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-16 bg-muted/30 py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={howItWorks.eyebrow} title={howItWorks.title} align="center" />

        <ol className="relative mt-12 grid gap-8 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-border md:grid-cols-4 md:gap-5 md:before:bottom-auto md:before:left-[12.5%] md:before:right-[12.5%] md:before:top-6 md:before:h-px md:before:w-auto">
          {howItWorks.steps.map((step, index) => (
            <li key={step.title} className="relative grid grid-cols-[2.5rem_1fr] gap-4 md:block md:text-center">
              <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_0_0_6px_var(--muted)] md:mx-auto md:h-12 md:w-12">
                {index + 1}
              </span>
              <div className="pb-2 md:mt-6">
                <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
