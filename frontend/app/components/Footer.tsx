import { Eye, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const social = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

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
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center shadow">
                <Eye className="w-6 h-6" />
              </div>
              <span className="text-xl font-semibold">VisionClass</span>
            </div>
            <p className="text-sm text-slate-300 max-w-md">
              Monitoreo pasivo de atención con visión por computadora e IA para cursos en línea y experiencias
              adaptativas.
            </p>
            <div className="flex gap-3">
              {social.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-100 hover:text-white hover:bg-white/10 transition"
                >
                  <item.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
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
          <p>© {currentYear} VisionClass. Todos los derechos reservados.</p>
          <p>Hecho con tecnología de vanguardia para la educación del futuro.</p>
        </div>
      </div>
    </footer>
  );
}
