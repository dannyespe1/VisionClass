# PR41 — Verificación

## Ensayo de migración

Ejecutado el 2026-09-17 en PostgreSQL 15 aislado con un usuario, una sesión, un evento, un resultado, una programación y un sobre temporal sintéticos.

- 0025 → 0026: las cuatro tablas quedaron archivadas, cada una con 1 fila.
- El vínculo temporal conservó el identificador `1` sin FK activa.
- El curso base quedó inactivo y marcado como archivado.
- 0026 → 0025: se restauraron las cuatro tablas, sus cuatro conteos `[1, 1, 1, 1]`, el vínculo y el curso.
- 0025 → 0026 repetido: completó correctamente.

## Comprobaciones requeridas

- `python manage.py check`
- `python manage.py makemigrations --check --dry-run`
- `python manage.py test api --noinput`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run typecheck`
- `node --test frontend/tests/*.test.mjs`
- `npm --prefix frontend run build`
- `python -m compileall -q ml`
- `python scripts/verify_pr41_archive.py`

No se usaron datos reales ni se registraron identificadores personales en evidencias.

## Resultado ejecutado

- Django `check`: PASS.
- Deriva de migraciones: PASS, sin cambios.
- Backend afectado: PASS, 28 pruebas.
- Contrato compartido: PASS, 2 pruebas con fixtures montados en solo lectura.
- Frontend: PASS en tipos, build y 68 pruebas.
- ML `compileall`: PASS.
- Guard PR41 y `git diff --check`: PASS.
- La suite backend completa expuso fallos preexistentes de PR22 al usar PostgreSQL (`FOR UPDATE` sobre el lado nullable de un outer join); no pertenecen a PR41. Los errores iniciales de fixtures se resolvieron montando `/contracts`.
- El lint global conserva deuda previa (51 errores y 35 advertencias, principalmente `no-explicit-any` y un error de hooks en administración). PR41 no incorpora una relajación de reglas ni oculta el resultado.
