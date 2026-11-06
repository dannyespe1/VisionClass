export type LandingNavItem = {
  label: string;
  href: string;
};

export type LandingFooterGroup = {
  title: string;
  links: LandingNavItem[];
};

export const landingNavItems: LandingNavItem[] = [
  { label: "Qué hace", href: "#que-hace" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Privacidad", href: "#privacidad" },
  { label: "Roles", href: "#roles" },
  { label: "Recursos", href: "#recursos" },
];

export const hero = {
  eyebrow: "Herramienta de observación educativa",
  title: "Evidencia observable asociada a la orientación hacia la tarea",
  subtitle:
    "AtenDynex procesa señales visuales localmente en el navegador y registra evidencia observable autorizada para contextos educativos. Sus resultados son inferencias sujetas a revisión humana, no mediciones directas de estados cognitivos.",
  primaryCta: "Solicitar evaluación institucional",
  secondaryCta: "Consultar documentación técnica",
  primaryHref: "/documentacion",
  secondaryHref: "/documentacion",
  microNotes: [
    "Procesamiento visual local",
    "Privacidad por diseño",
    "Sin transmisión de imágenes ni video",
  ],
} as const;

export const heroVisual = {
  sessionLabel: "SESIÓN AUTORIZADA",
  title: "Evidencia observable",
  localLabel: "Local",
  metrics: [
    { label: "SEÑAL", value: "Disponible" },
    { label: "CONTEXTO", value: "Registrado" },
    { label: "ESTADO", value: "Por revisar" },
  ],
  reviewTitle: "Revisión humana",
  reviewSubtitle: "Interpretación dentro del protocolo",
  privacyNote: "Privacidad por diseño",
  consentNote: "Consentimiento activo",
} as const;

export const landingFooter = {
  description:
    "Herramienta técnica para la observación de evidencia en contextos educativos.",
  groups: [
    {
      title: "Herramienta",
      links: [
        { label: "Qué hace", href: "#que-hace" },
        { label: "Cómo funciona", href: "#como-funciona" },
        { label: "Privacidad", href: "#privacidad" },
        { label: "Requisitos", href: "#requisitos" },
      ],
    },
    {
      title: "Roles",
      links: [
        { label: "Estudiante", href: "#roles" },
        { label: "Docente", href: "#roles" },
        { label: "Observador", href: "#roles" },
        { label: "Investigador", href: "#roles" },
      ],
    },
    {
      title: "Recursos",
      links: [
        { label: "Documentación", href: "/documentacion" },
        { label: "Seguridad", href: "/seguridad" },
        { label: "Acceso", href: "/login" },
        { label: "Privacidad", href: "/privacidad" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Política de privacidad", href: "/privacidad" },
        { label: "Términos de uso", href: "/terminos" },
      ],
    },
  ] satisfies LandingFooterGroup[],
  copyright:
    "© 2026 AtenDynex. Herramienta técnica para observación educativa e investigación.",
} as const;
