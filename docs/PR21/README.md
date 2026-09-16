# PR21 — Exponer el motor temporal

PR21 conecta el modelo de estados observables de PR20 con un endpoint interno autenticado y con persistencia idempotente en Django. No activa un modelo para producción, no transmite material crudo y no habilita intervenciones.

## Flujo

1. El consumidor entrega una ventana al endpoint ML `POST /internal/temporal/infer` con identidad de servicio y scope `temporal:infer`.
2. ML valida versión, tamaño, orden temporal, ontología y `model_id`; después devuelve únicamente estado, probabilidades, incertidumbre y calidad.
3. ML persiste el resultado mediante `POST /api/internal/ml/temporal-inferences/`, autenticado con scope `temporal:write`.
4. Django deriva la identidad desde `ObservationWindow`, nunca desde el payload, y garantiza una sola inferencia efectiva por ventana, modelo y versión.

Como alternativa, un consumidor de Redis Streams puede invocar `process_temporal_stream_event`. El mismo serializador y la misma operación idempotente se usan para ambos caminos. Los errores definitivos van directamente a DLQ; los transitorios conservan los reintentos acotados de PR13.

## Controles

- Feature flag backend `TEMPORAL_INFERENCE_API=False` por defecto.
- Token de servicio separado y scopes mínimos.
- Máximo de 16 KiB y 128 eventos por ventana.
- Timeout lógico de inferencia de 250 ms y timeout backend de 5 s.
- Estados permitidos: `no_observable`, `off_task_evidence` y `task_oriented_evidence`.
- `allow_intervention` debe ser `false`.
- Rechazo recursivo de campos de imagen, video, audio, frames o blobs.
- La respuesta no expone transiciones, emisiones ni otros parámetros del modelo.

## Configuración

Backend:

```text
TEMPORAL_INFERENCE_API=True
TEMPORAL_INFERENCE_MAX_BYTES=16384
ML_SERVICE_SCOPES=events:write,temporal:write
```

ML:

```text
BFF_SERVICE_SCOPES=frames:analyze,events:consume,models:read,temporal:infer
TEMPORAL_MODEL_PATH=/ruta/local/al/artefacto-aprobado.json
TEMPORAL_MAX_EVENTS=128
TEMPORAL_TIMEOUT_MS=250
TEMPORAL_MAX_BYTES=16384
ML_BACKEND_SERVICE_TOKEN=<secreto gestionado fuera de Git>
```

El artefacto sintético de `docs/PR20` se usa únicamente en pruebas y benchmark. PR22 deberá seleccionar y activar el artefacto desplegable con shadow mode y rollback.

## Compatibilidad y migración

La migración añade `inference_id` nullable para conservar registros históricos, el campo `quality` y una restricción condicional de unicidad aplicable a las nuevas inferencias PR21. Los estados heredados permanecen disponibles para lectura; el contrato PR21 solo acepta la ontología observable.

## Rollback

1. Establecer `TEMPORAL_INFERENCE_API=False`.
2. Detener el consumidor temporal o retirar el scope `temporal:infer`.
3. Conservar ventanas pendientes para reprocesamiento posterior.
4. No eliminar inferencias ni mensajes DLQ durante el rollback.

La migración es aditiva y no necesita revertirse para apagar el flujo.
