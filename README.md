# VisionClass - Plataforma de atencion inteligente

Sistema web con frontend en Next.js, backend en Django/DRF y servicio ML (MediaPipe + heuristicas de atencion). Contenedores via Docker Compose.

## Arquitectura
- Frontend: Next.js (app router), UI con Tailwind/React, paneles de estudiante, profesor y admin.
- Backend: Django + DRF + JWT (SimpleJWT). Endpoints para cursos, sesiones, atencion, pruebas D2R, generacion de tests IA.
- ML: FastAPI + MediaPipe (deteccion ocular) y heuristicas de atencion por frame. Preparado para CNN-LSTM.
- Base de datos: PostgreSQL (contenedor `db`).

## Requisitos
- Docker y Docker Compose
- (Opcional) Python/Node locales si quieres correr sin contenedores.

## Puesta en marcha rapida (Docker)
```bash
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py create_default_admin
```

## Cambios recientes
- Panel admin conectado a endpoints reales (usuarios, cursos, overview y analytics).
- Endpoints admin nuevos para politicas de privacidad y solicitudes de investigacion.
- Test D2R con 47 celdas fijas por fase y glifos con rayitas arriba/abajo.

## Endpoints admin principales
- `GET /api/admin/overview/`
- `GET/POST /api/admin/users/`
- `PATCH/DELETE /api/admin/users/{id}/`
- `GET/POST /api/admin/courses/`
- `PATCH/DELETE /api/admin/courses/{id}/`
- `GET /api/admin/analytics/`
- `GET/POST/PATCH /api/admin/privacy-policies/`
- `GET/POST/PATCH /api/admin/research-permissions/`
