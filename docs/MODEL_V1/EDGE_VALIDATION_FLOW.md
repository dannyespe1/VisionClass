# Flujo Edge de validación del modelo v1

## Objetivo

Validar el GRU canónico sin sacar imágenes, video ni audio del dispositivo y sin permitir que el resultado shadow cambie la experiencia del estudiante.

## Flujo

1. MediaPipe detecta el rostro y calcula características normalizadas dentro del navegador.
2. La compuerta de calidad produce `observable`, confianza y razón técnica.
3. El GRU canónico se descarga desde el mismo origen, valida longitud y SHA-256, y ejecuta la inferencia en el navegador.
4. Las características normalizadas permanecen en memoria dentro del navegador y no se persisten ni se transmiten en el modo Edge estricto.
5. Con consentimiento vigente de investigación, el navegador reporta como máximo un resultado shadow cada cinco segundos. El reporte sólo contiene sesión autorizada, identificador aleatorio de inferencia, tiempo y duración de ventana, calidad resumida, perfil Edge, versión y SHA-256 del artefacto, estado, probabilidad y declaraciones fijas de ejecución local/no intervención.
6. El backend vuelve a validar identidad, sesión, matrícula y consentimientos; verifica el artefacto contra el registro, recalcula el estado con el umbral canónico y crea una ventana sin características.
7. El panel del investigador presenta únicamente agregados que superan los mínimos de participantes y ventanas.

## Modelo canónico

La identidad canónica es la combinación `nombre + versión + SHA-256 + contrato de características + umbral`. Las implementaciones futuras en JavaScript, ONNX o TFLite pueden optimizar el runtime, pero sólo son equivalentes si conservan esa identidad lógica y superan pruebas de paridad numérica documentadas. Una optimización no puede cambiar silenciosamente pesos, preprocesamiento, orden de entradas ni umbral.

El artefacto actual es sintético, candidato y sólo apto para `shadow`. No está activo, no habilita intervenciones y no puede promocionarse hasta completar la evaluación aprobada con datos reales y alcanzar los criterios definidos.

## Datos mostrados al investigador

Además de cobertura, incertidumbre y distribución observable ya disponibles, el panel muestra:

- proporción de ventanas generadas localmente;
- proporción cuyo SHA-256 coincidió con el registro canónico;
- probabilidad media agregada de evidencia orientada a tarea;
- distribución agregada de perfiles Edge en el detalle técnico.

No muestra imágenes, características faciales por ventana, identificadores operativos, resultados individuales ni datos de dispositivo de alta granularidad.

## Activación local

Backend:

```text
TEMPORAL_SCHEMA_V2=True
MODEL_REGISTRY=True
NORMALIZED_FEATURES_V1=True
QUALITY_GATE_V1=True
EDGE_SHADOW_REPORTING=True
EDGE_SHADOW_REPORT_MIN_INTERVAL_SECONDS=5
EDGE_SHADOW_REPORT_MAX_BYTES=4096
```

Frontend:

```text
NEXT_PUBLIC_BROWSER_EXTRACTOR=true
NEXT_PUBLIC_NORMALIZED_FEATURES_V1=true
NEXT_PUBLIC_QUALITY_GATE_V1=true
NEXT_PUBLIC_MASKED_GRU_SHADOW=true
NEXT_PUBLIC_EDGE_SHADOW_REPORTING=true
NEXT_PUBLIC_EDGE_SHADOW_REPORT_INTERVAL_MS=5000
```

Registrar el artefacto una vez por base de datos:

```text
python backend/manage.py register_edge_model_v1
```

La captura puede funcionar sólo con procesamiento local. En Edge estricto no se crean registros `Observation`; el reporte derivado al panel requiere consentimiento de persistencia y de investigación.

## Rollback

Desactivar `NEXT_PUBLIC_EDGE_SHADOW_REPORTING` detiene nuevos reportes desde el navegador. Desactivar `EDGE_SHADOW_REPORTING` hace que el backend falle de forma cerrada con 503. El GRU puede continuar localmente en shadow y no cambia la medición oficial ni activa intervenciones.
