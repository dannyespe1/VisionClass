# PR41 — Restauración controlada

La restauración es para recuperación de evidencia, no para reactivar el producto.

1. Detener escrituras y crear un respaldo consistente de PostgreSQL.
2. Confirmar que el código desplegado corresponde al commit de PR41 y que las cuatro tablas `archive_*_pr41` existen.
3. Ejecutar `python backend/manage.py migrate api 0025_pr37_research_dashboard` en una copia primero.
4. Verificar conteos, claves foráneas y el vínculo `TemporalSession.d2r_session_id`.
5. Si la verificación es satisfactoria, repetir en el entorno autorizado durante una ventana de mantenimiento.
6. Para volver a PR41, ejecutar `python backend/manage.py migrate api 0026_pr41_archive_legacy_assessment`.

La reversión restaura nombres y estado ORM históricos, incluido el curso base archivado. No habilita endpoints ni UI mientras el código PR41 permanezca desplegado. Volver a un artefacto anterior requiere una decisión separada, revisión de seguridad/privacidad y no debe hacerse automáticamente.

Ante diferencias de conteos, detener el procedimiento y restaurar el respaldo; no ejecutar DDL manual sobre el origen.
