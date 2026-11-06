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

export const whatItDoes = {
  eyebrow: "Lo que hace y lo que no",
  title: "Una herramienta, no un producto milagroso",
  doesTitle: "Lo que hace",
  does: [
    "Procesa localmente señales visuales autorizadas mediante la cámara.",
    "Evalúa la calidad y suficiencia de la señal antes de producir resultados.",
    "Registra evidencia observable asociada a la orientación hacia la tarea.",
    "Mantiene un estado no observable cuando la señal resulta insuficiente.",
    "Permite contrastar inferencias con anotaciones humanas independientes.",
    "Transmite datos derivados únicamente cuando el consentimiento y el protocolo lo autorizan.",
  ],
  doesNotTitle: "Lo que NO hace",
  doesNot: [
    "No mide directamente la atención ni otros estados cognitivos.",
    "No identifica ni verifica biométricamente al estudiante.",
    "No transmite imágenes ni video en el funcionamiento previsto.",
    "No emite diagnósticos psicológicos, médicos ni educativos.",
    "No sustituye el criterio del docente o del investigador.",
    "No ejecuta decisiones o intervenciones automáticas sobre el estudiante.",
  ],
  closing:
    "La herramienta aporta evidencia complementaria; su interpretación siempre requiere contexto educativo, revisión humana y un protocolo previamente aprobado.",
} as const;

export const howItWorks = {
  eyebrow: "Cómo funciona",
  title: "Cuatro pasos, control en cada uno",
  steps: [
    {
      title: "Consentimiento y permisos",
      description:
        "La sesión comienza únicamente cuando existe consentimiento registrado y autorización para utilizar la cámara.",
    },
    {
      title: "Calibración y control de calidad",
      description:
        "La herramienta verifica que la señal sea observable y establece una referencia local para la sesión.",
    },
    {
      title: "Procesamiento edge",
      description:
        "Las señales visuales se procesan en el navegador y se transforman en características derivadas autorizadas.",
    },
    {
      title: "Contraste y análisis",
      description:
        "Las inferencias pueden contrastarse con anotaciones humanas, resultados académicos y otros instrumentos definidos en el protocolo.",
    },
  ],
} as const;

export const privacy = {
  eyebrow: "Arquitectura técnica",
  title: "La señal visual permanece en el dispositivo",
  description:
    "AtenDynex está diseñado para procesar localmente la señal de cámara. El backend recibe únicamente eventos derivados cuando su persistencia está habilitada y existe autorización vigente.",
  cards: [
    {
      title: "Procesamiento local",
      description:
        "La cámara se analiza temporalmente en el navegador. Las imágenes y el video no se almacenan ni se envían en el modo previsto.",
    },
    {
      title: "Consentimiento vigente",
      description:
        "La captura depende de las finalidades autorizadas. La ausencia, expiración o revocación del consentimiento detiene el tratamiento correspondiente.",
    },
    {
      title: "Datos derivados trazables",
      description:
        "Los eventos autorizados registran versión, sesión, calidad y procedencia sin incorporar la imagen original.",
    },
  ],
  cta: "Leer política de privacidad completa",
  href: "/privacidad",
} as const;

export const roles = {
  eyebrow: "Roles",
  title: "Diseñado para cada perfil educativo",
  cards: [
    {
      title: "Estudiante",
      bullets: [
        "Accede a cursos, materiales y evaluaciones.",
        "Controla el inicio de la cámara mediante el flujo autorizado.",
        "Recibe mensajes claros cuando la señal no es observable.",
      ],
    },
    {
      title: "Docente",
      bullets: [
        "Gestiona cursos, materiales y evaluaciones.",
        "Consulta calificaciones y progreso académico.",
        "Accede únicamente a resúmenes autorizados por el protocolo.",
      ],
    },
    {
      title: "Observador",
      bullets: [
        "Registra conducta visible durante ventanas sincronizadas.",
        "Trabaja sin consultar predicciones del modelo.",
        "Puede declarar evidencia incierta o no observable.",
      ],
    },
    {
      title: "Investigador",
      bullets: [
        "Consulta evidencia pseudonimizada y autorizada.",
        "Contrasta inferencias con anotaciones humanas.",
        "Revisa cobertura, incertidumbre y métricas del artefacto.",
      ],
    },
  ],
} as const;

export const requirements = {
  eyebrow: "Requisitos",
  title: "Qué se necesita para evaluar AtenDynex",
  items: [
    "Navegador moderno compatible con cámara y WebAssembly.",
    "Conexión HTTPS para habilitar los permisos de cámara.",
    "Cámara web disponible y autorizada por el participante.",
    "Consentimiento registrado y vigente para la finalidad aplicable.",
    "Recursos suficientes para cargar y ejecutar el procesamiento local.",
    "Conectividad con AtenDynex para persistir eventos derivados autorizados.",
  ],
  note: "Si necesitas más detalles técnicos, consulta la documentación.",
  href: "/documentacion",
} as const;

export const useCases = {
  eyebrow: "Casos de uso",
  title: "Aplicaciones previstas",
  cards: [
    {
      title: "Actividades de educación superior",
      description:
        "Recopilación complementaria de evidencia observable durante lecturas, videos y evaluaciones digitales, bajo un protocolo autorizado.",
    },
    {
      title: "Investigación educativa",
      description:
        "Construcción y validación de modelos mediante contraste con observaciones humanas, autoinformes y resultados académicos.",
    },
    {
      title: "Pilotos institucionales",
      description:
        "Evaluación técnica de compatibilidad, latencia, calidad de señal y comportamiento del procesamiento edge antes de ampliar el uso.",
    },
  ],
} as const;

export const docs = {
  eyebrow: "Recursos",
  title: "Documentación y enlaces",
  links: [
    { title: "Documentación general", href: "/documentacion", external: false },
    { title: "Privacidad y tratamiento de datos", href: "/privacidad", external: false },
    { title: "Seguridad de la plataforma", href: "/seguridad", external: false },
    { title: "Términos de uso", href: "/terminos", external: false },
    { title: "Acceso a AtenDynex", href: "/login", external: false },
    {
      title: "Repositorio técnico",
      href: "https://github.com/dannyespe1/VisionClass.git",
      external: true,
    },
  ],
} as const;

export const finalCta = {
  title: "¿Quieres evaluar AtenDynex en tu institución?",
  description:
    "Consulta los requisitos técnicos y metodológicos para planificar una evaluación controlada de la herramienta con tu institución o equipo de investigación.",
  button: "Solicitar evaluación institucional",
  href: "/documentacion",
  note: "Evaluación sujeta a disponibilidad, protocolo aplicable y autorización institucional",
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
