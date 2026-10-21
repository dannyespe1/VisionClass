# Deuda técnica conocida — AtenDynex frontend

Última actualización: 2026-10-16

## Estado de seguridad

### Vulnerabilidades productivas

✅ CERO. Todos los overrides necesarios están activos en `package.json`.

### Overrides activos en package.json (frontend)

| Paquete | Versión | Motivo |
| --- | --- | --- |
| `eslint-plugin-react-hooks` | `7.0.1` | Evita regresión de lint fuera de alcance (23 errores nuevos en versiones 7.1.x) |
| `sharp` | `0.35.5` | Cierra CVE productiva (era 0.35.4) |
| `source-map-js` | `1.2.2` | Cierra CVE productiva (era 1.2.1) |

### Vulnerabilidades de tooling (no producción)

5 vulnerabilidades altas en dependencias de desarrollo:

- `eslint-config-next`
- `@next/eslint-plugin-next`
- `fast-glob`
- `micromatch`
- `braces`

**Motivo:** la resolución automática requiere bajar `eslint-config-next` a `14.2.35`, incompatible con Next `16.4.0`.

**Plan:** esperar release upstream o evaluar migración a flat config de ESLint.

## Pendientes del rebranding

| Item | Ubicación | PR sugerido |
| --- | --- | --- |
| `LOGO.png` residual | `public/LOGO.png` | PR 10 (limpieza) |
| `DocumentationSection.tsx` huérfano | `app/components/DocumentationSection.tsx` | PR 10 (evaluar) |
| Formulario de contacto no envía | `app/components/ContactSection.tsx` | `fix/contact-form` (PR separado) |
| Social links con `href="#"` | `Footer.tsx` | Decisión de negocio |
| Ver demo sin acción | `HomePage.tsx` | Decisión de negocio |
| `info@atendynex.com` | `app/components/ContactSection.tsx` | Confirmar buzón real antes de publicar |
| `atendynex.com` | `app/layout.tsx` (`metadataBase`) | Confirmar dominio antes de publicar |

## Seguridad OAuth (P1)

Hallazgos del PR 4 (auditoría de login):

1. OAuth sin parámetro `state` → riesgo de login CSRF.
2. Sin PKCE (`code_challenge`/`code_verifier`) → riesgo de interceptación de código.
3. El backend acepta `redirect_uri` del cliente → riesgo de open redirect.
4. El código OAuth permanece en la URL después del procesamiento.

**Acción:** PR dedicado `fix/oauth-state-pkce` después del rebranding. Requiere coordinación backend + frontend y rollout gradual con feature flag. No modificar durante el rebranding.

## Legal / Compliance (P2)

Reescrituras diferidas del PR 4 (Grupo C):

- `seguridad/page.tsx`: cifrado, backups, monitoreo y protección de endpoints.
- `privacidad/page.tsx`: recopilación, retención y tratamiento.
- `terminos/page.tsx`: tratamiento, consentimiento y roles.
- `documentacion/page.tsx`: compromiso de soporte.

**Acción:** PR dedicado `legal/compliance-review` con DPO/legal.

## Contenido pendiente de verificación

- Testimonio "Dr. María Rodríguez - Universidad Nacional" eliminado. Agregar solo con autorización escrita y evidencia real.

## Responsive mobile — Overflow horizontal del menú

Detectado en PR 5: en 390px el menú mobile abierto produce desbordamiento horizontal. Es un comportamiento heredado de los navbars originales (Student/Instructor/Admin), no una regresión del refactor AppShell.

**Fix sugerido:** ajustar ancho del panel mobile o aplicar `overflow-x: hidden` en el contenedor.

**PR sugerido:** PR 10 (limpieza) o PR dedicado de responsive.

## Panel estudiante — Deudas detectadas en PR 6

- `app/student/course/[courseId]/page.tsx` tiene 2033 líneas y requiere división en sub-PRs. No se refactorizó durante el rebranding visual.
- La lógica de completado depende del literal `examen final` en `app/student/course/[courseId]/page.tsx`. No se debe renombrar el texto visible sin una migración coordinada.
- Los filtros de categorías usan IDs literales como `programacion` y `diseno`. No se deben renombrar esos IDs sin migración de datos.
- Los feature flags `BROWSER_EXTRACTOR`, `BOUNDED_CAPTURE_QUEUE` y `EDGE_PROFILES` afectan la captura EDGE sin mostrar siempre una explicación específica al estudiante.
- `app/student/CursosSection.tsx` usa una URL fija de Unsplash como imagen de respaldo. Debe reemplazarse por un asset aprobado en PR 10.
- `app/student/InicioSection.tsx` muestra `--` en “Tiempo de estudio”. Debe definirse el comportamiento y la fuente del valor antes de reemplazarlo.
- `app/student/page.module.css` no tiene importaciones conocidas. Evaluar y, si corresponde, eliminarlo en PR 10.

## Panel docente — Deudas detectadas en PR 7

- **H2 BLOQUEANTE:** existen 11 claims de “atención” en `app/instructor/page.tsx`, `app/instructor/components/EstadisticasProfesor.tsx` y `app/instructor/components/InicioProfesor.tsx`. Requieren una decisión de producto sobre qué representa `attention_score`; no deben reformularse hasta resolver H2.
- `app/instructor/components/MaterialesSection.tsx` tiene 1760 líneas. Su rebranding se divide en PR 7B (CRUD) y PR 7C (IA e importación/exportación JSON).
- `app/instructor/components/InstructorNavbar.tsx` es un wrapper de `AppShell`. Los textos compartidos de `nav-config` (“Profesor”, “Abrir menu” y “Estadisticas”) son deuda del PR 5 y quedan fuera del alcance de PR 7.
- `app/instructor/components/MaterialesSection.tsx` usa `"#"` como fallback de URL. Es una deuda funcional para PR 7B.
- `Recharts` recibe variables CSS como colores en `EstadisticasProfesor.tsx`; se debe verificar visualmente su compatibilidad en los navegadores admitidos.
- El panel heredado `EstadisticasProfesor` se activa cuando `TEACHER_GROUP_DASHBOARD_ENABLED=false`.

### MaterialesSection.tsx — Deudas detectadas en PR 7B

- La URL de YouTube se convierte incorrectamente en las líneas heredadas 537 y 702-706: se inserta el delimitador capturado en lugar del identificador del video. Es un bug funcional y queda fuera del alcance visual de PR 7B.
- La eliminación individual de un material no solicita confirmación antes de ejecutar la operación.
- Los archivos PDF se convierten completamente a Base64 en memoria; esto puede elevar el consumo de memoria con archivos grandes.
- La creación de un curso y su estructura no es transaccional. Un fallo intermedio puede dejar un curso creado parcialmente.
- No existe edición integral de un curso; la interfaz solo permite crearlo o eliminarlo y administrar sus módulos y lecciones.
- Los botones de reordenamiento carecían de nombres accesibles. PR 7B añade `aria-label` sin modificar sus handlers.
- PR 7C queda pendiente para generación con IA e importación/exportación JSON. Los bloques reservados son 104-107, 124-147, 177-179, 285-345, 541-598, 615-621, 1258-1508 y 1688-1731 de `MaterialesSection.tsx` en la base de PR 7B.

### MaterialesSection.tsx — Deudas detectadas en PR 7C

- **P1 — Fallback IA no identificado:** el backend puede devolver preguntas mock cuando Gemini falla o no está disponible. El frontend ignora el campo `detail` de la respuesta y presenta esas preguntas igual como “generadas por IA”. Un docente podría publicar contenido mock creyendo que es generación real.
  - **Acción:** en un PR dedicado, leer `detail` de la respuesta, mostrar procedencia (Gemini vs fallback) y siempre exigir revisión docente.
- **P2 — Título persistido en DB (línea 1439):** “Prueba generada automaticamente” se persiste en la DB como título del material. Cambiarlo sin migración rompería la detección.
  - **Acción:** PR de migración con script de actualización de títulos existentes. No tocar en rebranding.
- **P2 — Validación preliminar incompleta en cliente:** el cliente solo verifica `questions`. El servidor valida opciones, respuesta, dificultad, IDs y longitudes. La UI puede mostrar “válido” y el servidor rechazar.
  - **Acción:** evaluar validación más robusta en cliente en un PR funcional.
- **P3 — Límite 256 KB solo en cliente:** archivos mayores se rechazan antes de selección sin feedback claro.
- **P3 — Exportación directa de borrador:** un borrador generado por IA se crea inmediatamente como material del curso, sin paso intermedio de aprobación explícita.

## Panel admin — Deudas detectadas en PR 8

- **P0 — COMPLIANCE: políticas de privacidad sin aplicación efectiva:** el panel admin guarda políticas de privacidad —retención, anonimización, notificaciones y nivel de detalle—, pero no se encontraron consumidores que las apliquen en captura EDGE, retención de datos, anonimización ni notificaciones de riesgo. Esto significa que el administrador puede creer que configura algo que no se aplica, con riesgo legal y de expectativas.
  - **Acción:** PR dedicado para verificar y aplicar las políticas en backend. Prioridad alta antes de producción.
- **H3 BLOQUEANTE — Predicciones de abandono no validadas científicamente:** el backend usa la fórmula heurística determinista `(1 - promedio_atención) × 100 + proporción_baja_atención × 30 + días_inactividad`, pero el frontend afirma que “IA identifica estudiantes en riesgo”. Es técnicamente incorrecto y etiqueta estudiantes individualmente sin validación científica.
  - **Acción:** PR dedicado posterior al rebranding con el equipo científico —validar o eliminar la heurística—, legal —revisar la individualización— y producto —decidir si se oculta o reformula—. Hay 12 claims bloqueados documentados en la Tabla 4B de PR 8 Fase A.
- **H4 BLOQUEANTE — 9 acciones admin decorativas sin implementación:** exportar reporte institucional; ver lista completa para los niveles crítico, alto y medio; asignar a tutor; programar reunión; ver perfil completo; solicitar más información; y editar curso.
  - **Acción:** PR dedicado para implementar u ocultar estas acciones.
- **P2 — Endpoint analítico con efecto lateral:** la lectura de `/api/admin/analytics/` crea políticas predeterminadas si no existen. Un `GET` no debería tener efectos secundarios.
- **P2 — Recharts con variables CSS:** `AdminAnalyticsSection` usaba 10 valores hexadecimales. Su migración a `var(--*)` requiere verificación visual en los navegadores admitidos.

## Notas

- El PR 0.5 fue evaluado y cerrado como "no requerido": las correcciones de `sharp` y `source-map-js` ya estaban en el commit `0ee2197` del PR 0.
