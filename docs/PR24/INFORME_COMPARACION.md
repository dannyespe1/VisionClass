# Informe PR24 — Comparación temporal sintética

**Versión:** 1.0

**Fecha:** 2026-09-16

**Datos:** sintéticos

**Estado del candidato:** shadow, no activo

## Resultado

La ejecución verifica entrenamiento, enmascaramiento, comparación y registro reproducible. Las dos semillas GRU alcanzaron AUROC y AUPRC de 1,00 sobre el fixture deliberadamente simple, con cobertura 0,979. Estos valores no son evidencia científica ni estiman rendimiento real.

| Modelo | Sensibilidad | Especificidad | ECE | Parámetros | MAC estimadas/ventana |
| --- | ---: | ---: | ---: | ---: | ---: |
| PR19 logístico | 1,00 | 0,65 | 0,010 aprox. | 10 | 9 |
| PR20 HMM | 1,00 | 1,00 | cercano a 0 | 10 | 20 |
| GRU semilla 24017 | 1,00 | 0,75 | 0,0099 | 465 | 416 |
| GRU semilla 24023 | 1,00 | 0,75 | 0,0064 | 465 | 416 |

La especificidad de prueba del candidato GRU queda por debajo del mínimo congelado de 0,80, aunque su umbral fue válido en desarrollo. Esto demuestra por qué el holdout no debe usarse para reajustar el umbral: el candidato permanece en shadow y no es elegible para promoción con esta evidencia.

La variabilidad de AUROC/AUPRC fue cero en el fixture; Brier y ECE sí variaron entre semillas. Las curvas completas, umbrales, intervalos bootstrap, pesos sintéticos y costes están en `SYNTHETIC_GRU_COMPARISON.json`.

## Overfitting deliberado

La prueba específica entrena un subconjunto sintético durante 80 épocas y exige una reducción sustancial de la pérdida de entrenamiento. Su propósito es comprobar que la red y el flujo de gradientes pueden memorizar una muestra pequeña; no se presenta como generalización ni como ajuste recomendado.

## Conclusión

El pipeline neural es reproducible y respeta las fronteras de privacidad, pero el fixture no justifica sustituir PR20 ni activar el GRU. Una comparación real requiere datos minimizados aprobados, revisión de particiones, evaluación bajo PR23 y decisión posterior documentada.
