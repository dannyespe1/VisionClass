import Image from "next/image";
import Link from "next/link";
import { landingFooter } from "./content";

export function LandingFooter() {
  return (
    <footer className="bg-aten-bg-dark text-slate-300">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 border-b border-white/10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.45fr_repeat(4,1fr)]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="AtenDynex, inicio" className="inline-block">
              <Image
                src="/brand/atendynex-logo-white.svg"
                alt="AtenDynex"
                width={160}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">
              {landingFooter.description}
            </p>
          </div>

          {landingFooter.groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aten-primary-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="pt-7 text-xs leading-5 text-slate-500 sm:text-sm">
          {landingFooter.copyright}
        </p>
      </div>
    </footer>
  );
}
