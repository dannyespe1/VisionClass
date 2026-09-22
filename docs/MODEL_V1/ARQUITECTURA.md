# VisionClass — primera red neuronal de prueba

## Estado y propósito

`masked-gru-observable-evidence-v1-synthetic` es el primer artefacto neuronal materializado para pruebas integradas. Es un candidato **sintético, no validado y exclusivo de shadow mode**. No está activo, no autoriza intervenciones y no debe describirse como medidor de atención interna.

El modelo estima evidencia observable de orientación hacia la tarea a partir de características derivadas. No recibe imágenes, video ni audio.

## Arquitectura de la red

```text
Ventana normalizada (9 valores float32)
                 │
                 ├── máscara observable
                 ├── reset por inicio, gap > 7.5 s o cambio de perfil
                 ▼
       GRUCell(input_size=9, hidden_size=8)
                 │ estado oculto: 8 valores
                 │ reset a cero si no es observable
                 ▼
          Linear(in_features=8, out_features=1)
                 ▼
              Sigmoid
                 ▼
 probabilidad de evidencia de orientación a tarea
                 │
                 ├── >= umbral: task_oriented_evidence
                 ├── <  umbral: off_task_evidence
                 └── señal insuficiente: no_observable
```

| Elemento | Valor |
| --- | --- |
| Familia | GRU enmascarada many-to-many |
| Entrada por ventana | `[9]`, `float32` |
| Estado oculto | `[8]`, `float32` |
| Salida por ventana | un logit convertido con sigmoid |
| Parámetros entrenables | 465 |
| Tamaño de parámetros | 1.860 bytes en float32 |
| MAC estimadas por ventana | 416 |
| Material crudo requerido | no |
| Ejecución inicial | CPU, offline/shadow |

La `GRUCell` contiene tres puertas: reset, actualización y nueva información. Sus tensores son `weight_ih [24,9]`, `weight_hh [24,8]`, `bias_ih [24]` y `bias_hh [24]`. La cabeza contiene `weight [1,8]` y `bias [1]`.

## Contrato de entrada

El orden es parte del contrato `normalized-features-v1` y no puede alterarse:

1. `face_center_x` `[0,1]`
2. `face_center_y` `[0,1]`
3. `face_width` `[0,1]`
4. `face_height` `[0,1]`
5. `eye_span` `[0,1]`
6. `head_roll` `[-1,1]`
7. `gaze_horizontal_proxy` `[0,1]`
8. `pose_available` `[0,1]`
9. `gaze_available` `[0,1]`

Cada ventana aporta además `timestamp_ms`, `edge_profile_generation` y `quality.observable`. Una ventana no observable produce `no_observable`, probabilidad nula y reinicia el estado; no se convierte en una clase negativa.

## Flujo dentro del proyecto

```text
Cámara con permiso y consentimiento vigente
  → extracción local MediaPipe/fallback autorizado
  → normalización y puerta de calidad
  → secuencia de características derivadas
  → runtime GRU en shadow
  → resultado etiquetado con versión del modelo
  → comparación/telemetría agregada autorizada
```

El backend sigue siendo la única autoridad de identidad y permisos. El modelo no decide acceso, consentimiento, diagnóstico ni intervención. La inferencia debe permanecer local o dentro del servicio ML autorizado, sin enviar frames.

### Integración shadow en el navegador

Con `NEXT_PUBLIC_MASKED_GRU_SHADOW=true`, el frontend descarga desde su mismo origen el artefacto y su manifiesto, comprueba longitud y SHA-256 y ejecuta la GRU sobre cada evento normalizado que supera el flujo de consentimiento. El resultado permanece en memoria, se reinicia al detener la cámara y se muestra solamente como estado técnico dentro de la configuración de cámara.

El adaptador local de MediaPipe acepta tanto keypoints etiquetados como la salida ordenada de BlazeFace sin etiquetas. En este último caso usa únicamente los dos ojos y la punta de la nariz documentados por el modelo; ordena los ojos por su coordenada horizontal y falla de forma cerrada si los tres puntos no están disponibles o no son numéricos.

La salida shadow no reemplaza `attentionStatus`, no se envía al endpoint de observaciones, no se persiste y nunca entra al motor de intervenciones. Si el artefacto falta, cambia de origen, no coincide con el hash o tiene una configuración insegura, el runtime cae a `no_observable` y la salida oficial continúa sin cambios.

## Procedencia y entrenamiento inicial

Los pesos se obtuvieron en PR24 con un fixture determinista sintético de 18 participantes simulados. La partición fue exclusiva por participante: 60% entrenamiento, 20% validación y 20% prueba. Se entrenaron las semillas `24017` y `24023` durante 80 épocas; se seleccionó `24023` por menor pérdida de validación.

El umbral `0.013582718558609486` se seleccionó exclusivamente en validación. En la prueba sintética obtuvo sensibilidad `1.00`, especificidad `0.75`, AUROC `1.00`, AUPRC `1.00` y cobertura `0.9792`. La especificidad no alcanza el objetivo `0.80`; por eso el artefacto no es promocionable. Estas métricas solo verifican la tubería y no representan rendimiento con estudiantes reales.

## Construcción y prueba

Desde la raíz del repositorio:

```powershell
python -m ml.build_initial_model
python -m unittest ml.test_masked_gru_artifact -v
node --test frontend/tests/model-v1-shadow.test.mjs
```

Uso mínimo:

```python
from ml.masked_gru_artifact import MaskedGRUInferenceRuntime

runtime = MaskedGRUInferenceRuntime.load(
    "ml/artifacts/masked-gru-observable-evidence-v1-synthetic.json"
)
predictions = runtime.predict(windows_normalizadas)
```

El artefacto JSON evita serialización ejecutable, fija el orden de las entradas y valida el SHA-256 de los pesos al cargarlo.

## Condiciones para avanzar

Antes de canary o activación deben existir datos aprobados y pseudonimizados, evaluación por participante con holdout intacto, especificidad mínima `0.80`, sensibilidad mínima `0.70`, calibración y cobertura aceptables, revisión de equidad, paridad en dispositivos objetivo y aprobación independiente. El rollback inmediato es retirar el artefacto o mantener el alias estable actual; nunca se debe convertir este candidato sintético en modelo activo.
