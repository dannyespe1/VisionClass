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
| `soporte@visionclass.ec` | `app/privacidad/page.tsx` | PR 4 |
| `info@atendynex.com` | `app/components/ContactSection.tsx` | Confirmar buzón real antes de publicar |
| `atendynex.com` | `app/layout.tsx` (`metadataBase`) | Confirmar dominio antes de publicar |

## Notas

- El PR 0.5 fue evaluado y cerrado como "no requerido": las correcciones de `sharp` y `source-map-js` ya estaban en el commit `0ee2197` del PR 0.
