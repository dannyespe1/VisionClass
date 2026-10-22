# Rebranding VisionClass → AtenDynex (completado)

## Resumen ejecutivo

El rebranding técnico de VisionClass a AtenDynex se ejecutó entre el 13 y el 22 de octubre de 2026. El ciclo integró 13 PR funcionales —contando PR 7A, 7B y 7C como unidades independientes— y un PR documental auxiliar para registrar deuda técnica. El alcance comprendió seguridad de dependencias, identidad visual, lenguaje científico conservador, navegación compartida, paneles por rol y limpieza final. No implicó la aprobación de los gates científicos, legales u operativos pendientes.

| Dato | Resultado verificable |
| --- | --- |
| Fecha de inicio | 2026-10-13, merge de PR 0 (`fc070f2`) |
| Fecha de cierre | 2026-10-22, merge de PR 10 (`504c948`) |
| Duración | 10 días calendario, distribuidos en dos semanas calendario |
| PR funcionales integrados | 13 (PR 0-10, con PR 7 dividido en 7A, 7B y 7C) |
| PR documental auxiliar | 1 (`6219e0e`, deuda técnica) |
| Cambios acumulados | 2.327 inserciones y 2.806 eliminaciones en 74 archivos |
| Archivos eliminados por PR 10 | 13 |
| Referencias residuales a VisionClass | 0 en la UI activa auditada por PR 10; se conservan identificadores técnicos compatibles y texto en componentes históricos no importados |

## PR del rebranding

Los hashes corresponden a los commits de merge presentes en `origin/main`.

| PR | Alcance | Merge | Fecha | Logros clave |
| --- | --- | --- | --- | --- |
| 0 | Saneamiento de seguridad | `fc070f2` | 2026-10-13 | Actualizó Next.js, retiró Axios no utilizado y dejó en cero las vulnerabilidades productivas documentadas. |
| 1 | Tokens y tipografía | `c59ddc7` | 2026-10-13 | Incorporó tokens semánticos AtenDynex y Plus Jakarta Sans mediante `next/font`. |
| 2 | Branding provisional | `9427be1` | 2026-10-13 | Añadió logo provisional, favicon, metadata e imagen Open Graph de AtenDynex. |
| 3 | Landing y claims científicos | `866a767` | 2026-10-13 | Rebrandeó la landing y sustituyó afirmaciones no sustentadas por lenguaje de evidencia observable, señales e inferencias. |
| 4 | Login y páginas legales | `97adeb2` | 2026-10-14 | Aplicó identidad AtenDynex sin alterar la lógica de autenticación y registró pendientes legales y de OAuth. |
| 5 | AppShell compartido | `d7a5c8f` | 2026-10-15 | Consolidó navegación, perfil y cierre de sesión compartidos; el PR redujo 216 líneas netas en su conjunto. |
| 6 | Panel del estudiante | `7bafc73` | 2026-10-16 | Alineó navegación, estados y textos del panel con la identidad y el lenguaje conservador. |
| 7A | Shell docente, inicio y estadísticas | `645ed66` | 2026-10-21 | Rebrandeó la estructura docente y documentó claims que requieren definición científica posterior. |
| 7B | Gestión de materiales | `ffec456` | 2026-10-21 | Actualizó la interfaz de materiales y registró pendientes funcionales del flujo heredado. |
| 7C | IA y JSON de materiales | `99257e5` | 2026-10-21 | Rebrandeó generación e importación/exportación y documentó procedencia del fallback y validación pendiente. |
| 8 | Panel administrativo | `4bddfb3` | 2026-10-21 | Aplicó identidad AtenDynex y explicitó que las políticas configurables aún requieren aplicación efectiva. |
| 9 | Paneles Observer y Research | `43cff2b` | 2026-10-21 | Unificó presentación y terminología conservadora sin cambiar contratos de datos. |
| 10 | Limpieza final | `504c948` | 2026-10-22 | Eliminó 13 residuos, corrigió responsive, migró componentes compartidos a tokens y cerró la verificación integral. |

El PR documental auxiliar `6219e0e` (2026-10-13) creó el registro inicial de deuda técnica; no se contabiliza como implementación funcional del rebranding.

## Decisiones clave

- **Tokens semánticos:** el color primario quedó en `#4F46E5`; la combinación de primer plano definida para acciones primarias fue verificada con criterio WCAG AA durante PR 1.
- **Tipografía local al build:** Plus Jakarta Sans se carga mediante `next/font`, sin depender de una petición a Google Fonts durante la ejecución del navegador.
- **Navegación compartida:** `AppShell`, `EditableProfileMenu`, `LogoutButton` y la configuración de navegación sustituyeron wrappers duplicados. El cambio completo de PR 5 tuvo una reducción neta de 216 líneas.
- **Lenguaje científico conservador:** la UI prioriza “evidencia observable”, “señales”, “inferencias” y estados de incertidumbre; no presenta una inferencia como medición cognitiva directa ni diagnóstico.
- **Consentimiento y cámara:** disponer de permisos técnicos para la cámara no sustituye el consentimiento informado ni los demás requisitos del protocolo.
- **Diferimientos explícitos:** OAuth con `state`/PKCE, procedencia del fallback de IA y hallazgos H1-H5 quedaron registrados para PR dedicados; no se declararon resueltos por el rebranding.

## Cambios de identidad

| Antes | Después |
| --- | --- |
| VisionClass | AtenDynex |
| “Atención promedio 85%” y métricas promocionales sin fuente | Cobertura o disponibilidad de señal observable, sin porcentaje promocional no sustentado |
| “Monitoreo pasivo de atención en tiempo real” | Procesamiento local de señales visuales durante la actividad educativa |
| “Detectamos atención” | Derivación de señales observables e inferencias con estados de incertidumbre |
| `LOGO1.png` y recursos residuales | `public/brand/atendynex-logo.svg`, variante blanca y `app/icon.svg` |
| Azul corporativo disperso | Tokens semánticos con índigo primario `#4F46E5` |
| Geist | Plus Jakarta Sans mediante `next/font` |
| Barras de navegación independientes | `AppShell` y componentes compartidos por rol |

Los assets de `public/brand/` continúan identificados como provisionales hasta que el equipo de diseño entregue recursos definitivos.

## Estado de verificación

La verificación registrada en el commit de PR 10 (`fdb6d0c`) fue:

| Comprobación | Resultado |
| --- | --- |
| TypeScript (`typecheck`) | PASS |
| ESLint (`lint`) | PASS |
| Build de Next.js | PASS, 15/15 rutas generadas |
| Pruebas Node | PASS, 116/116 |
| Referencias de marca antigua en UI activa auditada | 0 |
| Colores `slate`/`blue` o hexadecimales en `app/components/shared/` | 0 en la comprobación de cierre |

La referencia “0 en UI activa” no incluye identificadores técnicos versionados que deben conservar compatibilidad, como nombres de esquemas o claves de almacenamiento. Dos componentes históricos no importados conservan texto de la marca anterior y están registrados en deuda técnica antes de decidir su eliminación.

## Pendientes posteriores al rebranding

El detalle, riesgo y acción de cada pendiente se mantiene en [`frontend/TECH_DEBT.md`](../frontend/TECH_DEBT.md). Al cierre existen 1 entrada P0, 4 frentes P1, 10 entradas P2 y 7 entradas P3, contados por subsecciones temáticas; el frente H1-H5 contiene cinco hallazgos internos.

- **P0 — Compliance:** aplicación efectiva de políticas de privacidad configurables.
- **P1 — Seguridad e integridad científica:** OAuth con `state`/PKCE, identificación del fallback de IA, resolución documentada de H1-H5 y conversión heredada de URLs de YouTube.
- **P2 — Fiabilidad y mantenimiento:** revisión legal, tooling, polling del Observer, pruebas Node en CI, validación JSON y otras deudas funcionales registradas.
- **P3 — Contenido y pulido:** imágenes externas de Unsplash, datos de contacto, colores directos remanentes y manual de usuario Fase C.

## Lecciones aprendidas

- Separar Fase A de auditoría y Fase B de ejecución redujo cambios fuera de alcance y permitió revisar decisiones antes de editar.
- Detener la implementación ante ambigüedades evitó convertir suposiciones científicas, legales o funcionales en afirmaciones de producto.
- Registrar deuda en `TECH_DEBT.md` desde el inicio conservó trazabilidad sin ampliar cada PR.
- Coordinar al Product Owner y al agente antes de mergear evitó que un worktree quedara desalineado mientras seguía en uso.
- Dividir superficies extensas —como PR 7A, 7B y 7C— mantuvo cada cambio revisable y reversible.

## Alcance del cierre

Este documento certifica el cierre técnico y documental del rebranding. No aprueba el modelo para intervención, no valida claims científicos, no sustituye revisión legal/DPO y no modifica los gates definidos para captura, entrenamiento, evaluación o despliegue.
