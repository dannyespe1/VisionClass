# PR12 — Estado temporal distribuido

Se añade un almacén de estado inyectable para Redis con posición de ventana, calidad acumulada, versión de modelo y revisión. Las claves usan HMAC-SHA256 sobre participante, curso y sesión; no exponen esos identificadores.

Cada escritura renueva TTL y `compare_and_set` usa `WATCH/MULTI` para impedir actualizaciones perdidas. Una nueva instancia recupera el mismo estado desde Redis. `DISTRIBUTED_STATE=False` mantiene el flujo actual hasta pruebas con Redis real.

Rollback: apagar el flag, detener escritores, invalidar únicamente el namespace afectado y reconstruir desde eventos confirmados. No usar memoria local como sustituto multiinstancia.
