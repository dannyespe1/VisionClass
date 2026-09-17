# Runbooks operativos PR39

Regla común: declarar incidente, asignar responsable, conservar el identificador de correlación y tiempos, detener despliegues, no copiar cuerpos ni datos personales a tickets. La recuperación termina sólo al verificar salud, integridad y ausencia de pérdida silenciosa.

## Instancia backend

Alerta: disponibilidad o `health/live` falla. Propietario: `on_call`.

1. Retirar la instancia defectuosa del tráfico; no desactivar autenticación ni consentimiento.
2. Revisar eventos estructurados por patrón de ruta y correlación, sin consultar payloads.
3. Reiniciar o reemplazar una instancia y verificar `live`, `ready` y tasa de error.
4. Si el error persiste, revertir el último despliegue compatible. Confirmar migraciones antes de revertir código.

## Redis y cola

Alerta: check Redis o consumo de cola falla. Propietario: `queue_owner`.

1. Detener productores no esenciales y conservar idempotencia; nunca reenviar a ciegas.
2. Verificar conectividad, memoria, política de expulsión, pendientes y dead-letter queue.
3. Restaurar Redis y procesar pendientes con límites y deduplicación.
4. Comparar contadores producidos, consumidos, duplicados y fallidos antes de cerrar.

## Base de datos

Alerta: readiness de base o restauración falla. Propietario: `database_owner`.

1. Bloquear escrituras y separar la instancia con fallo.
2. Identificar el último backup cuya restauración e integridad estén verificadas.
3. Restaurar en una base nueva; ejecutar migraciones compatibles y verificaciones de filas/digest.
4. Cambiar tráfico sólo tras una segunda revisión. No sobrescribir la base original.

## Servicio/modelo ML

Alerta: `/health` falla o aumenta el error de inferencia. Propietario: `ml_owner`.

1. Desactivar inferencia online y conservar `unknown`/`no_observable`; no activar intervenciones.
2. Verificar servicio, artefacto, memoria, latencia y contrato, sin frames ni imágenes en logs.
3. Volver al artefacto aprobado anterior o mantener el fallback local autorizado.
4. Reactivar sólo tras smoke test, compatibilidad y observación en shadow mode.

## Privacidad

Alerta: posible dato personal, secreto o material crudo en telemetría. Propietario: `privacy_officer`.

1. Detener la fuente y restringir acceso al artefacto; no replicarlo en tickets o chat.
2. Identificar alcance, sistema, ventana temporal y responsables autorizados.
3. Eliminar según política de retención; rotar secretos si aplica y preservar auditoría minimizada.
4. Exigir revisión de privacidad antes de reactivar. Seguir el protocolo institucional de notificación.

## Parada del drill

Ante pérdida de integridad, acceso a un destino no loopback, aparición de datos no sintéticos o recursos fuera del prefijo `visionclass-pr39-`, detener inmediatamente. Ejecutar `docker compose ... down -v` únicamente sobre el proyecto aislado confirmado y conservar los JSON de resultados.
