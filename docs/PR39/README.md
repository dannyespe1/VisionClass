# PR39 — Operación y pruebas de carga

## Alcance y estado

PR39 prepara observabilidad, capacidad, recuperación y runbooks. `PRODUCTION_OBSERVABILITY` está apagado por defecto. Su activación sólo añade eventos JSON mínimos por solicitud y una cabecera de correlación; no registra cuerpo, query string, identidad, dirección IP ni parámetros concretos de ruta.

Los SLO de `SLO_ALERTAS.json` son una propuesta técnica con estado `PROPOSED_NOT_APPROVED`. No habilitan producción ni piloto y requieren aprobación independiente antes de G6. Cada alerta declara propietario y acción.

## Ejecución aislada

Todos los comandos siguientes usan servicios sintéticos y puertos loopback. Las herramientas rechazan URLs no locales y los fallos exigen un proyecto cuyo nombre comience por `visionclass-pr39-`.

```powershell
docker compose -p visionclass-pr39-drill -f ops/pr39/docker-compose.drill.yml up -d --wait
python ops/pr39/load_test.py --profile target --output docs/PR39/evidence/load-target.json
python ops/pr39/load_test.py --profile peak --output docs/PR39/evidence/load-peak.json
python ops/pr39/backup_restore_drill.py --confirm-isolated --output docs/PR39/evidence/backup-restore.json
python ops/pr39/failure_drill.py --project visionclass-pr39-drill --compose-file ops/pr39/docker-compose.drill.yml --failure instance --confirm-isolated --output docs/PR39/evidence/failure-instance.json
python ops/pr39/failure_drill.py --project visionclass-pr39-drill --compose-file ops/pr39/docker-compose.drill.yml --failure redis_queue --confirm-isolated --output docs/PR39/evidence/failure-redis.json
python ops/pr39/failure_drill.py --project visionclass-pr39-drill --compose-file ops/pr39/docker-compose.drill.yml --failure database --confirm-isolated --output docs/PR39/evidence/failure-database.json
python ops/pr39/failure_drill.py --project visionclass-pr39-drill --compose-file ops/pr39/docker-compose.drill.yml --failure model --ml-url http://127.0.0.1:19000 --confirm-isolated --output docs/PR39/evidence/failure-model.json
docker compose -p visionclass-pr39-drill -f ops/pr39/docker-compose.drill.yml down -v
```

Si una prueba detecta pérdida de integridad, se detiene el ensayo, no se reutiliza el volumen y se conserva sólo el reporte sin contenido sensible. Nunca se conectan estas herramientas a una base o URL real.

## Trazabilidad

La cabecera `X-Correlation-ID` acepta únicamente un UUID canónico; cualquier otro valor se sustituye por un UUID nuevo. Esto impide propagar identificadores libres. Los eventos incluyen método, patrón de ruta, estado, duración y resultado. El patrón evita que identificadores incluidos en la URL lleguen al log.

La verificación de carga espera primero un `ready` exitoso e informa p50, p95, p99, máximo, throughput y tasa de error. No demuestra capacidad de producción: es un ensayo reproducible del entorno controlado y debe repetirse en infraestructura candidata aprobada antes de G6.
