# Informe PR23 — Evaluación dinámica

**Versión:** 1.0

**Fecha:** 2026-09-16

**Clasificación de datos:** sintéticos

**Decisión confirmatoria:** `NOT_EVALUABLE_SYNTHETIC`

## Propósito y método

Este informe verifica que el protocolo congelado puede ejecutarse de extremo a extremo sin fuga entre participantes. Se compararon predicciones dinámicas y estáticas sobre las mismas ventanas de `test`; se excluyó `no_observable` de clasificación, se mantuvo en denominadores de cobertura y se rompieron segmentos sin interpolar.

El fixture tiene 15 participantes sintéticos, de los cuales 4 pertenecen a `test`, y 40 ventanas de prueba. No representa la distribución de la población, no alcanza N=80 y no contiene resultados de participantes reales.

## Resultados de verificación sintética

| Área | Resultado |
| --- | ---: |
| Cobertura de inferencia dinámica | 0,975 |
| AUROC dinámica | 1,000 |
| AUPRC dinámica | 1,000 |
| Sensibilidad dinámica | 1,000 |
| Especificidad dinámica | 1,000 |
| AUROC baseline estático | 0,894 |
| Ganancia F1 de tarea frente al baseline | 0,087 |
| Volatilidad media adyacente | 0,282 |
| Entropía predictiva normalizada | 0,680 |

Las dos repeticiones de bootstrap por participante están en `SYNTHETIC_DYNAMIC_EVALUATION.json`. El reporte también incluye matriz completa de transiciones, denominadores, persistencia, episodios en milisegundos, recuperación con censura, demora de cambio, ruido y errores anónimos por participante.

## Lectura de los resultados

La salida confirma el funcionamiento técnico del evaluador, no el desempeño científico del modelo. En particular:

- el gate permanece no evaluable por usar datos sintéticos;
- no se alcanza el tamaño objetivo;
- la ganancia F1 de tarea sintética de 0,087 no alcanza el SESOI de 0,10;
- clasificación y dinámica no establecen validez del constructo;
- no se permite inferir atención interna, cognición, intención, diagnóstico ni causalidad.

## Fallos y condiciones de no uso

El evaluador falla de forma cerrada ante fuga de participante, identidad o timestamp inválido, ventana observable sin etiqueta/calidad, probabilidad en `no_observable`, configuración inválida y uso de la procedencia de umbral sintético con datos reales.

El modelo no debe usarse cuando falten consentimiento o permiso vigentes, la señal sea no observable, falle calidad, se exceda el gap, cambie la generación del perfil, no pueda verificarse la partición, la muestra sea insuficiente, falle cualquier mínimo conjunto o se pretenda automatizar una intervención o diagnóstico.

## Pendientes confirmatorios

No se ejecutó la evaluación con datos reales minimizados y aprobados. Tampoco se ejecutó la revisión independiente del código, splits y métricas descrita en `REVISION_INDEPENDIENTE.md`. Ambos elementos deben completarse antes de tratar PR23 como evidencia científica o cerrar la definición confirmatoria de terminado.
