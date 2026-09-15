# PR08 — Separación de observaciones y estados inferidos

PR08 introduce un esquema expansivo y desactivado por defecto mediante `TEMPORAL_SCHEMA_V2=False`. No elimina ni modifica los eventos históricos existentes.

El esquema distingue sesiones temporales, observaciones, ventanas agregadas, estados inferidos, transiciones e intervenciones. Las observaciones conservan tiempos de captura, recepción y procesamiento; las inferencias viven en registros separados con probabilidades, incertidumbre, versión y procedencia. Se admite explícitamente `no_observable`.

## Compatibilidad y rollback

La migración es exclusivamente aditiva. El código existente continúa leyendo y escribiendo `AttentionEvent` y `D2RAttentionEvent`. Para rollback operativo se mantiene el flag apagado. La reversión de migración solo debe ejecutarse si las tablas nuevas no contienen información que deba conservarse; de lo contrario se exportan primero sus metadatos autorizados.

No se utilizaron participantes, frames ni datos reales.
