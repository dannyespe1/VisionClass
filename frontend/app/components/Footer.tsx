import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "Inicio", href: "#inicio" },
    { label: "Nosotros", href: "#nosotros" },
    { label: "Contacto", href: "#contacto" },
    { label: "Iniciar sesión", href: "/login" },
  ];

  const legal = [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos de uso", href: "/terminos" },
    { label: "Seguridad", href: "/seguridad" },
    { label: "Documentación", href: "/documentacion" },
  ];

  return (
    <footer className="bg-slate-950 text-slate-100 pt-14 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="w-40 h-8 flex items-center">
              <Image
                src="/brand/atendynex-logo-white.svg"
                alt="AtenDynex"
                width={160}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-sm text-slate-300 max-w-md">
              Registro de evidencia observable mediante procesamiento visual local para actividades educativas.
            </p>
            {/* TODO(rebranding): reactivar enlaces sociales cuando existan URLs oficiales. */}
            <div className="flex gap-3" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-100 uppercase tracking-wide">Enlaces</h3>
              <ul className="space-y-2 text-sm">
                {links.map((link) => (
                  <li key={link.label}>
                    <a className="text-slate-300 hover:text-white transition" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-100 uppercase tracking-wide">Legal</h3>
              <ul className="space-y-2 text-sm">
                {legal.map((link) => (
                  <li key={link.label}>
                    <a className="text-slate-300 hover:text-white transition" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <p>© {currentYear} AtenDynex. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
