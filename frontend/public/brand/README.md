# Assets de marca AtenDynex (PROVISIONALES)

⚠️ Estos assets fueron generados automáticamente como placeholders técnicos. El equipo de diseño debe reemplazarlos por los definitivos.

## Archivos

- `atendynex-logo.svg` — Wordmark horizontal (color base).
- `atendynex-logo-white.svg` — Wordmark horizontal (blanco, headers oscuros).

## Cómo reemplazar

1. Sobrescribir los archivos manteniendo exactamente el mismo nombre.
2. Mantener el `viewBox` y el aspect ratio para no romper el layout de la barra de navegación.
3. Si cambia el ratio, actualizar las referencias en:
   - `app/components/Navbar.tsx` (PR 3).
   - `app/components/Footer.tsx` (PR 3).
   - `app/login/*` (PR 4).

## Favicon

- `app/icon.svg` — Next.js lo detecta automáticamente.
- `app/favicon.ico` se conserva como fallback heredado hasta que el branding definitivo permita retirarlo de forma verificada.

## Imagen Open Graph

- `app/opengraph-image.tsx` — Generada dinámicamente por Next.js.
- Si se requiere un diseño personalizado, reemplazarla por `app/opengraph-image.png` (1200 × 630) y eliminar el archivo `.tsx`.

## Colores de marca

- Primary: `#4F46E5`.
- Secondary: `#06B6D4`.
- Accent: `#F59E0B`.

## Estado

Todos estos recursos son provisionales y reemplazables sin cambiar los nombres públicos de los archivos.
