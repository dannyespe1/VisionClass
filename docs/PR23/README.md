# PR23 — Evaluación del modelo dinámico

PR23 incorpora un evaluador versionado para comparar las probabilidades del modelo temporal con un baseline estático sobre exactamente las mismas ventanas de la partición `test`. El evaluador no entrena, no selecciona umbrales y no imputa ventanas durante la evaluación.

## Protocolo congelado

La configuración `ml/config/pr23_dynamic_evaluation_v1.json` materializa P0.3 v0.2 y las decisiones ratificadas en G3:

| Parámetro | Valor |
| --- | ---: |
| SESOI | 0,10 |
| N objetivo | 80 participantes |
| N máximo | 100 participantes |
| Límite inferior IC 95 % AUROC | 0,75 |
| Sensibilidad mínima | 0,70 |
| Especificidad mínima | 0,80 |
| Mejora absoluta AUPRC sobre prevalencia | 0,15 |

El umbral `0.5` del artefacto de verificación es un umbral de desarrollo congelado para el fixture sintético y su procedencia está marcada como `synthetic_development_fixture`. El ejecutor rechaza su uso con datos reales. En la evaluación real debe reemplazarse por el umbral elegido exclusivamente en desarrollo, registrar su procedencia, versionar la nueva configuración antes de abrir `test` y no ajustarlo después de observar resultados.

## Contrato de entrada

Cada registro requiere `participant_id`, `session_id`, `window_id`, `split`, `timestamp_ms`, `duration_ms`, `edge_profile_generation`, `label`, `dynamic_probability`, `baseline_probability` y `quality`. Un participante solo puede pertenecer a una partición. Las probabilidades y la etiqueta deben ser nulas cuando `quality.observable` no sea verdadero.

El documento raíz de entrada usa:

```json
{
  "data_classification": "synthetic",
  "records": []
}
```

La clasificación real admitida es `real_approved_confirmatory`. El nombre sirve como control explícito y no sustituye la comprobación operativa de consentimiento, permisos, protocolo, acceso ni minimización de datos.

## Métricas

- **Clasificación:** AUROC, AUPRC, sensibilidad, especificidad, F1 macro, exactitud balanceada, Brier, ECE, prevalencia, cobertura y matriz de confusión.
- **Dinámica:** cambio absoluto adyacente, persistencia, matriz de transiciones, duración de episodios, recuperación, demora de detección de cambios y entropía predictiva.
- **Ruido:** ventanas `no_observable`, fallos de calidad, gaps y cambios de generación de perfil.
- **Participante:** cobertura y tasa de error por participante, sin identificadores personales.
- **Incertidumbre:** bootstrap por participante repetido con las semillas `23017` y `23023`.

Los gaps mayores a `1.5 × 5000 ms`, un cambio de generación o `no_observable` rompen la continuidad. No se interpola. Recuperaciones y cambios sin evento observado se reportan como censurados a la derecha.

## Ejecución

Verificación sintética reproducible:

```powershell
python -m ml.run_dynamic_evaluation --synthetic --config ml/config/pr23_dynamic_evaluation_v1.json --output docs/PR23/SYNTHETIC_DYNAMIC_EVALUATION.json --code-version <commit>
```

Evaluación aprobada:

```powershell
python -m ml.run_dynamic_evaluation --input <entrada-minimizada.json> --config <config-con-umbral-congelado.json> --output <informe-versionado.json> --code-version <commit>
```

## Interpretación y límites

La clasificación mide coincidencia con etiquetas observacionales dentro de este protocolo. Las métricas dinámicas describen estabilidad y cambio de evidencia observable. Ninguna de ellas establece atención interna, cognición, diagnóstico, intención ni causalidad. Un resultado sintético nunca puede aprobar el gate confirmatorio.

El modelo no debe usarse con señal no observable, calidad fallida, consentimiento o permiso de cámara inválido, discontinuidad no controlada, fuga entre participantes, muestra insuficiente, incumplimiento conjunto de umbrales ni para intervención automática o diagnóstico.

## Rollback

Revertir el evaluador, su configuración y sus informes no altera modelos, inferencias ni datos. Si se cambia una métrica o estimando después de observar `test`, la salida debe publicarse como exploratoria bajo una nueva versión; nunca debe reemplazar el resultado confirmatorio congelado.
