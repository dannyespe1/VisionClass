# VisionClass – Plataforma de atención inteligente

Sistema web con frontend en Next.js, backend en Django/DRF y servicio ML (MediaPipe + heurísticas de atención). Contenedores vía Docker Compose.

## Arquitectura
- Frontend: Next.js (app router), UI con Tailwind/React, paneles de estudiante, profesor y admin.
- Backend: Django + DRF + JWT (SimpleJWT). Endpoints para cursos, sesiones, atención, pruebas D2R, generación de tests IA.
- ML: FastAPI + MediaPipe (detección ocular) y heurísticas de atención por frame. Preparado para CNN-LSTM.
- Base de datos: PostgreSQL (contenedor `db`).

## Requisitos
- Docker y Docker Compose
- (Opcional) Python/Node locales si quieres correr sin contenedores.

## Puesta en marcha rápida (Docker)
```bash
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py create_default_admin
