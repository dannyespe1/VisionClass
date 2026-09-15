# PR13 — Redis Streams

Se implementa un productor/consumidor reusable con stream principal, grupo de consumidores, acknowledgements, reclamación de pendientes, reintentos acotados y dead-letter stream. Propaga `contract_version`, `event_id` y `correlation_id`.

La persistencia efectiva es idempotente mediante marcador por `event_id`. Los errores guardan únicamente el tipo de excepción, nunca el mensaje o contenido. `STREAM_PIPELINE=False` mantiene el endpoint síncrono como fallback limitado.

Rollback: pausar consumidores, apagar el flag, drenar o aislar pendientes y volver temporalmente al endpoint síncrono. No borrar el DLQ antes de registrar causa y decisión de reproceso.
