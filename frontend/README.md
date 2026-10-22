# AtenDynex — Frontend

Aplicación web de una plataforma educativa que registra y organiza evidencia observable mediante procesamiento visual local en el navegador. Las señales e inferencias resultantes no constituyen una medición cognitiva directa ni un diagnóstico.

## Stack

- Next.js 16.4.0 con App Router.
- React 19.2.0.
- TypeScript 5.9.3 en modo estricto.
- Tailwind CSS 4.
- Radix UI y primitivas shadcn.
- MediaPipe Tasks Vision 1.0.1 para procesamiento local.

## Estructura

- `app/`: rutas, páginas y componentes de la aplicación.
- `app/components/shared/`: shell, navegación, perfil y cierre de sesión compartidos.
- `app/ui/`: primitivas de interfaz.
- `public/brand/`: logos provisionales de AtenDynex.
- `public/models/`: artefactos de inferencia local y sus manifiestos.
- `tests/`: pruebas Node de contratos y comportamiento frontend/EDGE.

## Scripts

Ejecuta los comandos desde la raíz del repositorio:

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Documentación

- [`TECH_DEBT.md`](TECH_DEBT.md): deuda conocida, priorizada y con acciones sugeridas.
- [`../docs/REBRANDING_COMPLETED.md`](../docs/REBRANDING_COMPLETED.md): historia verificable y cierre del rebranding VisionClass → AtenDynex.
- [`../docs/`](../docs/): decisiones técnicas, seguridad, privacidad, gates y planes de trabajo.

Los nombres técnicos heredados de esquemas, formatos o claves de almacenamiento se conservan cuando cambiarlos rompería compatibilidad. No deben presentarse como identidad visible del producto.
