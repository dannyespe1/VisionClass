# Runbook de rollback PR22

1. Confirmar el alias y su revisión con `manage_model_rollout status`.
2. Detener aumentos de porcentaje canary.
3. Ejecutar `manage_model_rollout rollback` con un `reason-code` estable y no sensible.
4. Actualizar `MODEL_ROLLOUT_MODE`, rutas de artefacto y revisión en el gestor del entorno.
5. Reiniciar únicamente el consumidor temporal afectado.
6. Verificar que la salida efectiva referencia la versión restaurada y que el evento `rolled_back` existe.
7. Conservar ventanas, inferencias y DLQ. No reprocesar hasta una autorización del protocolo.

Si el backend no está disponible, desactivar `TEMPORAL_INFERENCE_API` para detener el flujo de forma segura. No se debe continuar con un alias que no pueda auditarse.
