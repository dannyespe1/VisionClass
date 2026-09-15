# Runbook Redis

Redis se ejecuta sin puerto publicado, en la red interna `state`, con contraseña obligatoria, AOF, límite de 128 MiB y política `volatile-ttl`. Toda clave funcional debe usar el namespace `visionclass:v1` y TTL explícito.

## Inicio y comprobación

1. Definir `REDIS_PASSWORD` en el gestor local/CI; nunca guardarlo en Git.
2. Ejecutar `docker compose up -d redis`.
3. Confirmar el health check y `/api/health/ready/`.

## Indisponibilidad

Si Redis falla, readiness responde 503 cuando `REDIS_ENABLED=True`. Apagar los consumidores dependientes y mantener el endpoint síncrono limitado. No cambiar a memoria local como fuente de verdad distribuida.

## Respaldo, actualización y rollback

El AOF es operativo, no sustituye PostgreSQL ni un respaldo aprobado. Antes de actualizar, detener productores, drenar pendientes y respaldar el volumen cifrado según política. Para rollback, establecer `REDIS_ENABLED=False`, detener consumidores y conservar el volumen hasta concluir la revisión.
