# TECH_DEBT.md — Estado de AtenDynex

Última actualización: 2026-10-22

Este documento consolida la deuda conocida del frontend por prioridad. Una entrada cerrada conserva su historial y no equivale a aprobación científica, legal u operativa.

## Rebranding completado (PRs 0-10)

| PR | Alcance | Estado | Fecha |
| --- | --- | --- | --- |
| PR 0 | Saneamiento de seguridad y dependencias productivas | Integrado | 2026-10-13 |
| PR 1 | Tokens AtenDynex y Plus Jakarta Sans | Integrado | 2026-10-13 |
| PR 2 | Marca visual provisional, metadata, icono y Open Graph | Integrado | 2026-10-13 |
| PR 3 | Landing pública | Integrado | 2026-10-13 |
| PR 4 | Login y páginas legales | Integrado | 2026-10-14 |
| PR 5 | AppShell y navegación compartida | Integrado | 2026-10-15 |
| PR 6 | Panel estudiante y tokens de estado | Integrado | 2026-10-16 |
| PR 7A | Panel docente, inicio y estadísticas | Integrado | 2026-10-21 |
| PR 7B | Gestión de materiales | Integrado | 2026-10-21 |
| PR 7C | IA e importación/exportación JSON | Integrado | 2026-10-21 |
| PR 8 | Panel administrativo | Integrado | 2026-10-21 |
| PR 9 | Paneles Observer y Research | Integrado | 2026-10-21 |
| PR 10 | Limpieza final, responsive y estados visuales | En verificación; pendiente de commit y revisión | 2026-10-22 |

## P0 — Compliance (URGENTE)

### Políticas de privacidad sin aplicación efectiva — PR 8

El panel administrativo guarda políticas de retención, anonimización, notificaciones y nivel de detalle, pero no se encontraron consumidores que demuestren su aplicación en captura EDGE, retención, anonimización o notificaciones de riesgo.

**Riesgo:** el administrador puede interpretar que una política configurada ya se aplica cuando no existe evidencia técnica de ello.

**Acción:** PR dedicado de backend y operación, con revisión legal/DPO, pruebas negativas, migración, observabilidad y rollback. No se resuelve dentro del rebranding.

## P1 — Seguridad e integridad científica

### OAuth sin `state` ni PKCE — PR 4

1. OAuth no usa `state`, con riesgo de login CSRF.
2. No usa PKCE (`code_challenge`/`code_verifier`).
3. El backend acepta `redirect_uri` aportado por el cliente.
4. El código OAuth permanece en la URL después del procesamiento.

**Acción:** PR coordinado frontend/backend `fix/oauth-state-pkce`, con rollout gradual y pruebas negativas.

### Fallback IA no identificado — PR 7C

El backend puede devolver preguntas mock cuando Gemini falla o no está disponible. El frontend ignora `detail` y puede presentarlas como generadas por IA.

**Acción:** mostrar procedencia real —Gemini o fallback— y exigir revisión docente antes de publicar.

### Hallazgos H1-H5

Los identificadores H1-H5 pertenecen al registro de hallazgos del ciclo de revisión y no deben confundirse con las hipótesis científicas H1-H3 de `docs/P0.3/`.

- **H1:** falta incorporar al repositorio la referencia versionada de su decisión y alcance.
- **H2 — Claims de atención en panel docente:** existen 11 claims en `app/instructor/page.tsx`, `EstadisticasProfesor.tsx` e `InicioProfesor.tsx`. Requieren definir qué representa `attention_score` antes de reformularlos.
- **H3 — Predicciones de abandono no validadas:** el backend usa una fórmula heurística determinista mientras la interfaz afirma que la IA identifica estudiantes en riesgo. Requiere revisión científica, legal y de producto.
- **H4 — Acciones administrativas decorativas:** nueve acciones visibles no están implementadas, entre ellas exportar reporte, asignar tutor, programar reunión, ver perfil y editar curso. Deben implementarse u ocultarse.
- **H5:** falta incorporar al repositorio la referencia versionada de su decisión y alcance.

**Acción:** enlazar el documento de hallazgos aprobado antes de cerrar H1-H5. PR 10 no modifica estas superficies.

### Conversión heredada de URLs de YouTube — PR 7B

`MaterialesSection.tsx` inserta el delimitador capturado en lugar del identificador del video en un flujo heredado.

**Acción:** corregir con pruebas unitarias específicas en un PR funcional.

## P2 — Fiabilidad y mantenimiento

### Legal / Compliance — PR 4

Revisión pendiente con DPO/legal de:

- `seguridad/page.tsx`: cifrado, backups, monitoreo y endpoints.
- `privacidad/page.tsx`: recopilación, retención y tratamiento.
- `terminos/page.tsx`: consentimiento y responsabilidades.
- `documentacion/page.tsx`: compromiso de soporte.

### Vulnerabilidades de tooling — PR 0

Las vulnerabilidades productivas quedaron en cero. Permanecen cinco vulnerabilidades altas en dependencias de desarrollo: `eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch` y `braces`.

La resolución automática propone bajar `eslint-config-next` a `14.2.35`, incompatible con Next `16.4.0`. Esperar corrección upstream o evaluar migración a ESLint flat config.

Overrides activos:

| Paquete | Versión | Motivo |
| --- | --- | --- |
| `eslint-plugin-react-hooks` | `7.0.1` | Evita una regresión de lint fuera de alcance. |
| `sharp` | `0.35.5` | Corrige vulnerabilidad productiva. |
| `source-map-js` | `1.2.2` | Corrige vulnerabilidad productiva. |

### Polling permanente del Observer — PR 9

El panel solicita datos cada tres segundos y actualiza el reloj cada 250 ms aun sin ventana activa.

**Acción:** limitar reloj y polling al periodo con una ventana activa.

### Recharts con variables CSS — PR 7A / PR 8

La migración a `var(--*)` se verificó en los PR 7A y PR 8. Sigue pendiente conservar una verificación visual explícita en todos los navegadores admitidos cuando se actualice Recharts.

### Validación preliminar incompleta del JSON — PR 7C

El cliente comprueba principalmente `questions`; el servidor valida además opciones, respuesta, dificultad, IDs y longitudes. La interfaz puede considerar válido un archivo que el servidor rechazará.

### Efecto lateral en `/api/admin/analytics/` — PR 8

Una lectura `GET` crea políticas predeterminadas cuando no existen. El endpoint analítico debería ser libre de efectos laterales.

### CI no ejecuta las pruebas Node — PR 5

No se encontró una invocación de `node --test frontend/tests/*.test.mjs` en la configuración de CI versionada. Incorporarla requiere una decisión explícita para no convertir un fallo de línea base en check obligatorio sin coordinación.

### Panel estudiante — PR 6

- `app/student/course/[courseId]/page.tsx` supera las dos mil líneas y requiere división coordinada.
- El completado depende del literal persistido `examen final`.
- Los filtros usan IDs persistidos como `programacion` y `diseno`.
- Algunos feature flags EDGE no muestran siempre una explicación específica al estudiante.

### Gestión de materiales — PR 7B / PR 7C

- La eliminación individual no solicita confirmación.
- Los PDF se convierten completamente a Base64 en memoria.
- La creación de curso y estructura no es transaccional.
- No existe edición integral de un curso.
- El título `Prueba generada automaticamente` está persistido y requiere migración antes de renombrarlo.

### Grant de investigación — PR 9

El panel muestra proyecto, propósito y vencimiento, pero no presenta de forma explícita alcance de cohorte/modelo/perfil, aprobador, estado de aprobación y referencia ética.

## P3 — Contenido y pulido

### URLs externas de Unsplash

Permanecen imágenes externas en cinco superficies: About, Login, Inicio del estudiante, Cursos del estudiante e Inicio del docente.

**Acción:** sustituirlas cuando existan assets de diseño locales aprobados. Diferido fuera de PR 10.

### Contenido y datos de contacto

- Agregar testimonios únicamente con autorización escrita y evidencia verificable.
- Confirmar `info@atendynex.com`, el teléfono publicado y el dominio `atendynex.com` antes de producción.
- El formulario de contacto todavía no envía información.
- “Ver demo” continúa sin acción asociada.

### Textos y pruebas acopladas

Las pruebas verifican textos visibles como “Procedencia”, “Ventanas observables”, “Validez”, “Equidad” y claims de privacidad. Los cambios editoriales deben actualizar las pruebas correspondientes.

### Colores directos remanentes

PR 10 migra únicamente `AppShell`, `EditableProfileMenu` y `LogoutButton`. Permanecen 124 apariciones de clases `slate`/`blue` en 14 archivos de páginas públicas, legales y de autenticación. Su migración requiere un PR visual separado para evitar ampliar la limpieza final.

### Componentes históricos

`PrivacySection.tsx`, `SecuritySection.tsx` y `TermsSection.tsx` no se importan actualmente, pero se conservan porque aparecen en evidencia histórica. Revisar esa evidencia antes de eliminarlos.

### Importación y borradores de pruebas — PR 7C

- El límite de 256 KB se aplica solo en el cliente y requiere feedback más claro.
- El borrador generado por IA se crea como material sin una aprobación intermedia explícita.

### Manual de usuario — Fase C

La redacción del manual permanece diferida hasta integrar PR 10 y resolver los hallazgos bloqueantes definidos por el Product Owner.

## Cerrado por PR 10

- Eliminados 13 residuos: tres CSS Modules sin imports, `DocumentationSection.tsx`, ocho assets públicos sin referencias y `favicon.ico` heredado.
- `app/icon.svg` queda como favicon AtenDynex activo; la verificación final depende del build y la inspección del navegador.
- Corregido el overflow horizontal del AppShell en móvil mediante composición vertical fuera del flujo de la fila.
- Componentes compartidos migrados de `slate`/`blue` a tokens AtenDynex.
- Estados técnicos de Research y Observer traducidos solo en presentación, sin alterar contratos.
- Enlaces sociales sin URL oficial ocultos; conservado un TODO para reactivarlos.
- “Tiempo de estudio” muestra “No disponible” mientras no exista una fuente funcional.
- README del frontend reemplazado por una descripción mínima de AtenDynex.

## Notas

- PR 0.5 fue evaluado como no requerido: `sharp` y `source-map-js` ya estaban corregidos por PR 0.
- Cerrar una deuda exige evidencia verificable; moverla a esta sección no aprueba gates científicos, legales ni operativos.
