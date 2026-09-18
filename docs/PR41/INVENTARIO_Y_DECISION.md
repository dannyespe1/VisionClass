# PR41 — Archivo definitivo del componente D2R

Fecha de retiro: 2026-09-17. Dependencias verificadas: PR02 y PR40 integrados en `wave8-integracion`.

## Decisión

Se retira el componente de toda superficie ejecutable. No se eliminan de forma irreversible los registros históricos porque no se dispone de los SHA-256 de respaldos externos. La migración 0026 renombra las cuatro tablas como archivo sin modelos ORM, rutas HTTP, administración, UI, trabajos ni exportadores. El acceso queda limitado a retención y al procedimiento de restauración controlado.

El antiguo interruptor de producto se elimina el 2026-09-17. No existe una ruta de reactivación por variable de entorno. Restaurar las tablas sirve únicamente para recuperación o revisión; una reactivación funcional exige nueva revisión independiente.

## Inventario retirado

| Superficie | Resultado |
| --- | --- |
| Frontend | Ruta, widgets, banners, gate de login, programación y paneles específicos eliminados. |
| API | Cuatro recursos DRF, serializadores, permisos y administración eliminados. |
| ML | Contrato dual y envío a endpoints heredados eliminados; solo admite sesiones de curso. |
| Esquema | Tablas renombradas con prefijo `archive_`; modelos activos eliminados. |
| Esquema temporal | La relación activa se convierte en `legacy_assessment_source_id`, sin FK al archivo. |
| Operaciones | Exportadores y comando de limpieza específicos retirados. |
| Retención | El borrado por participante incluye las tablas archivadas mediante acceso SQL mínimo. |
| Documentación | README, contrato compartido, ejemplos de entorno y verificadores actualizados. |

## Tablas archivadas

- `archive_api_d2rsession_pr41`
- `archive_api_d2rattentionevent_pr41`
- `archive_api_d2rresult_pr41`
- `archive_api_d2rschedule_pr41`

No contienen datos de prueba versionados. El ensayo se realizó únicamente con un participante sintético dentro de un volumen PostgreSQL aislado.

## Criterio de eliminación futura

Las tablas podrán eliminarse en un cambio posterior cuando exista constancia del vencimiento de retención, respaldo verificable y aprobación independiente de privacidad. La eliminación deberá incluir réplicas, exportaciones y backups aplicables.
