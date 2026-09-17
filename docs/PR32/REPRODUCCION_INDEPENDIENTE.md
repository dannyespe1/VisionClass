# Procedimiento de reproducción independiente

Este procedimiento debe ser ejecutado por una persona que no haya desarrollado el analizador antes de aceptar resultados reales. La entrega técnica no registra esta revisión como completada.

## Insumos

- Dataset minimizado aprobado y su SHA-256.
- `ml/config/pr32_validity_agreement_v1.json` y su SHA-256.
- Versión sellada del protocolo P0.3 y manual de anotación.
- Commit exacto y entorno Python 3.11.

## Revisión

1. Confirmar 80–100 participantes, 14 fases completas por sesión y ausencia de identidad directa o material crudo.
2. Seleccionar una muestra determinista ordenando el seudónimo por SHA-256 y tomando los primeros 20 participantes. No seleccionar por outcomes.
3. Con una implementación independiente —R, Julia u otro script que no importe módulos de este repositorio— reproducir tabla de prevalencia, acuerdo observado, acuerdo esperado y kappa de Cohen.
4. Sobre el dataset completo, repetir el bootstrap agrupando participantes completos. Nunca remuestrear ventanas como unidades independientes.
5. Reproducir al menos una asociación concurrente y una desplazada, verificando pares y participantes incluidos.
6. Reproducir sensibilidad, especificidad, Brier y ECE con umbral fijo 0.5; no optimizarlo.
7. Comparar con tolerancia absoluta de `1e-10` para estimaciones puntuales. Para bootstrap, usar la misma semilla y algoritmo o justificar diferencias esperadas del generador.
8. Registrar herramienta, versión, código, hashes, resultados, diferencias y decisión del revisor.

Si una diferencia no se explica por redondeo o generador pseudoaleatorio, PR32 permanece sin aceptación estadística y las conclusiones se retiran hasta corregir el análisis.
