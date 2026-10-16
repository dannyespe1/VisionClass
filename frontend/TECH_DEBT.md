# Deuda técnica conocida — AtenDynex frontend

Última actualización: 2026-10-13

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

## Notas

- El PR 0.5 fue evaluado y cerrado como "no requerido": las correcciones de `sharp` y `source-map-js` ya estaban en el commit `0ee2197` del PR 0.
