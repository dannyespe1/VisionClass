# PR24 — Baseline temporal GRU en shadow

PR24 añade un baseline GRU pequeño y reproducible sobre `normalized-features-v1`. Es un candidato offline: no modifica el servicio, no crea un alias activo y nunca autoriza intervenciones.

## Diseño

- Una `GRUCell` procesa secuencias agrupadas por participante y sesión.
- Las ventanas `no_observable` usan vector cero y máscara explícita; cortan el segmento, reinician el estado oculto y no generan probabilidad evaluable. Los gaps mayores a 7,5 segundos y los cambios de generación de perfil también reinician el estado.
- El split reutiliza el algoritmo, semilla y fracciones de PR19 antes de construir secuencias.
- El conjunto `test` no participa en entrenamiento, selección de semilla ni selección de umbral.
- La semilla candidata se selecciona por la menor pérdida final de validación.
- El umbral se selecciona exclusivamente en validación con sensibilidad mínima 0,70 y especificidad mínima 0,80.
- El artefacto queda registrado como `shadow_only`, `active=false` y `allow_intervention=false`.

## Comparación

El runner entrena las semillas `24017` y `24023` y compara sobre las mismas ventanas de prueba:

1. clasificador logístico por ventana de PR19;
2. HMM de evidencia observable de PR20;
3. GRU enmascarada de PR24.

Cada modelo reporta AUROC, AUPRC, sensibilidad, especificidad, Brier, ECE, cobertura, matriz de confusión e intervalos bootstrap por participante. La variabilidad entre semillas GRU se informa como mínimo, máximo, media y desviación estándar. El coste estructural registra parámetros y multiplicaciones-acumulaciones estimadas por ventana.

## Reproducción sintética

```powershell
docker run --rm -v "<worktree>:/workspace" -w /workspace vision_system-ml:latest python -m ml.run_neural_temporal_baseline --synthetic --config ml/config/pr24_masked_gru_v1.json --output docs/PR24/SYNTHETIC_GRU_COMPARISON.json --code-version <commit-base>
```

Para datos aprobados, el JSON de entrada debe declarar `data_classification=approved_pseudonymized` y contener `windows`. No deben versionarse entradas, pesos ni resultados derivados de participantes reales.

## Privacidad e interpretación

El modelo usa únicamente características normalizadas autorizadas; no requiere frames, imágenes, video ni audio. Los identificadores de análisis se usan para separar participantes, pero el informe solo conserva conteos y un hash de la asignación.

La salida describe evidencia observable de orientación hacia la tarea. No mide atención interna, cognición, intención, diagnóstico ni causalidad. Un mejor promedio no habilita promoción automática.

## Rollback

Retirar el módulo, runner, configuración y artefactos PR24. Al no existir conexión con el servicio ni alias activo, el rollback no modifica inferencias, esquemas ni datos persistidos.
