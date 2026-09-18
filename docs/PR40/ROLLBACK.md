# Rollback del candidato PR40

Objetivo: detener nuevas acciones en menos de 5 minutos y recuperar el servicio técnico en un máximo de 300 segundos, alineado con el SLO de recuperación más conservador.

## Procedimiento

1. Mantener o establecer `PILOT_RELEASE=False` y `NEXT_PUBLIC_PILOT_RELEASE=false`.
2. Confirmar que PR35–PR38 y sus allowlists permanezcan apagados.
3. Retirar el candidato del tráfico; no revertir migraciones destructivamente.
4. Restaurar la versión anterior compatible y comprobar `health/live` y `health/ready`.
5. Si existe pérdida de integridad, restaurar en una base nueva desde el último backup validado; nunca sobrescribir la fuente.
6. Verificar consentimiento, borrado, alertas y permisos de exportación antes de cerrar.

## Ensayo local

El entorno usa el prefijo exacto `visionclass-pr40-rehearsal` y datos sintéticos. La reversión ejecuta `docker compose ... down -v` sólo sobre ese proyecto. Si aparece un destino no local o dato real, detener sin continuar.

El rollback no autoriza reactivar un módulo pendiente, una versión anterior insegura ni un modelo no aprobado.
