# PR14 — Retención y eliminación verificable

Se incorpora planificación y ejecución separadas. El modo predeterminado es dry-run y registra únicamente conteos y un HMAC del sujeto, nunca el contenido eliminado. La ejecución borra datos derivados del esquema temporal, eventos heredados, bóveda y mapeo seudónimo, y publica una orden de eliminación para claves/streams Redis.

La tarea programada aplica plazos distintos a observaciones, estados/autoinformes, telemetría y registros de bóveda. Repetir una eliminación completada produce conteos cero.

`RETENTION_JOBS=False` permanece apagado. Backups y exportaciones externas requieren inventario y procedimiento operativo independiente; esta implementación no promete eliminación de destinos que no están conectados al repositorio.
