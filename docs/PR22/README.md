# PR22 — Shadow mode, canary y rollback de modelos

PR22 añade alias de modelo por entorno, comparación shadow aislada, canary determinista, umbrales automáticos y rollback auditable. No activa ningún artefacto al desplegar este cambio: el endpoint temporal continúa bajo `TEMPORAL_INFERENCE_API=False` por defecto y el rollout inicia en modo `stable`.

## Garantías

- Shadow ejecuta el candidato, pero la salida efectiva siempre procede del modelo activo.
- No se persisten probabilidades ni estados del candidato shadow; solo latencia, error y concordancia agregable.
- Canary asigna tráfico mediante SHA-256 de entorno, alias e `inference_id`; la misma entrada conserva la misma ruta.
- Un error del candidato canary usa el modelo activo como fallback.
- Django valida alias, revisión, rol y versión antes de persistir una inferencia.
- Promoción y rollback mueven referencias de registro; no migran ni reescriben inferencias históricas.
- Cada cambio genera un `ModelRolloutEvent` inmutable con motivo, configuración y métricas.

## Umbrales predeterminados

| Control | Umbral |
| --- | ---: |
| p95 de latencia | 250 ms |
| Tasa de error | 0,02 |
| Error de calibración | 0,10 |
| Muestra mínima | 100 |

Los umbrales son configuración operacional versionada, no evidencia de validez científica. Una muestra inferior al mínimo impide promoción y no se interpreta como ausencia de degradación.

## Configuración ML

```text
TEMPORAL_MODEL_PATH=/artefactos/modelo-estable.json
TEMPORAL_CANDIDATE_MODEL_PATH=/artefactos/modelo-candidato.json
MODEL_ROLLOUT_ENVIRONMENT=staging
MODEL_ROLLOUT_ALIAS=temporal-default
MODEL_ROLLOUT_MODE=shadow
MODEL_ROLLOUT_CANARY_PERCENT=0
MODEL_ROLLOUT_REVISION=2
```

La revisión y las versiones configuradas deben coincidir con `ModelAlias`; una configuración obsoleta es rechazada por el backend.

## Operación

El comando `manage_model_rollout` admite `create`, `status`, `shadow`, `canary`, `evaluate`, `promote` y `rollback`. Los identificadores de operador son etiquetas operativas sin correo, nombre personal ni token.

Ejemplo conceptual:

```powershell
python backend/manage.py manage_model_rollout shadow --alias-id 1 --candidate-model-id 2 --recorded-by release-controller
python backend/manage.py manage_model_rollout canary --alias-id 1 --percentage 10 --recorded-by release-controller
python backend/manage.py manage_model_rollout evaluate --alias-id 1 --metrics-json '{"sample_count":100,"p95_latency_ms":20,"error_rate":0.01,"calibration_error":0.05}' --recorded-by rollout-monitor
```

No se incluyen secretos en argumentos, salida o eventos de auditoría.

## Rollback

Durante shadow o canary, rollback elimina el candidato y conserva el modelo estable. Después de una promoción, restaura `previous_model`, retira el modelo defectuoso y registra el motivo. Las ventanas e inferencias existentes permanecen intactas y solo se reprocesan si el protocolo lo autoriza.
