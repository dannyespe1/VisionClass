# P0.3 v0.2 — Enmienda prospectiva de dinámica temporal

**Fecha:** 2026-09-15  
**Versión base conservada:** `PREREGISTRO_CONFIRMATORIO.json` v0.1  
**Estado:** candidato prospectivo pendiente de ratificación independiente  
**Acceso a outcomes o scores reales antes de esta enmienda:** no  
**Entrenamiento o evaluación autorizados:** no

## 1. Motivo y alcance

La versión 0.1 denominaba “estabilidad” a una pendiente lineal de `F1_tarea` a través de 14 fases. Esa pendiente describe tendencia media, pero no cuantifica volatilidad, persistencia, transiciones, episodios ni recuperación. Esta enmienda conserva H1 y H2, reclasifica la antigua H3 como tendencia y congela estimandos temporales explícitos antes de cualquier acceso a outcomes o scores reales.

Esta enmienda no aprueba P0.3, G3, reclutamiento, entrenamiento ni evaluación. Tampoco convierte señales visuales en ground truth o medición de atención interna.

## 2. Terminología y separación obligatoria

- `F1_tarea` representa desempeño en la tarea de cancelación visual.
- El autoinforme representa experiencia declarada en la ventana indicada.
- La anotación representa orientación observable a la tarea, fuera de ella o `no_observable`.
- Las características visuales y sus scores son predictores técnicos, nunca ground truth.
- Los estados derivados representan evidencia observable con incertidumbre, no atención interna.
- `no_observable` permanece como estado explícito; no se convierte en distracción, clase negativa, cero ni imputación.
- Cambio de perfil Edge, calidad insuficiente, iluminación, huecos y no observabilidad se registran separadamente de la dinámica atribuible al participante.

## 3. Reglas temporales congeladas

Sea `x_it` una medida definida para el participante `i` en el instante o fase ordenada `t`. Un par es **contiguo evaluable** solo si ambos extremos son observables, pasan la puerta de calidad, pertenecen a la misma sesión y perfil Edge, y su separación no supera `1.5 × stride_esperado`. Un gap, `no_observable`, fallo de calidad o cambio de perfil corta el segmento; nunca se interpola para el análisis confirmatorio.

| Estimando | Regla congelada | Familia |
| --- | --- | --- |
| Tendencia | Pendiente de `F1_tarea ~ phase_index` con estructura por participante de v0.1; se denomina tendencia, no estabilidad | secundaria confirmatoria (`H3_trend`) |
| Volatilidad | `V_i = sum(|x_it - x_i,t-1|) / n_pares_validos`; se informa por participante y agregado, con denominador | secundaria descriptiva (`T1`) |
| Persistencia | Para estado observable `a`, `P_aa = N(a→a) / sum_b N(a→b)` sobre pares contiguos evaluables | secundaria descriptiva (`T2`) |
| Transición | `P_ab = N(a→b) / sum_b N(a→b)`; matriz completa con conteos y denominadores | secundaria descriptiva (`T3`) |
| Episodio / dwell time | Corrida máxima contigua del mismo estado observable; duración = suma de duraciones de ventana dentro de la corrida | secundaria descriptiva (`T4`) |
| Recuperación | Desde inicio de un episodio `orientado_fuera_de_tarea` hasta dos ventanas contiguas `orientado_a_tarea`; sin recuperación es censura a la derecha | exploratoria (`T5`) |
| Entropía predictiva | `H_t = -sum_k p_tk ln(p_tk) / ln(K)` para la distribución del modelo sobre `K` estados observables; no mide incertidumbre cognitiva | técnica secundaria (`T6`) |
| Cobertura | `C = ventanas_observables_validas / ventanas_elegibles`; se reportan además cobertura de etiqueta y cobertura de inferencia | técnica secundaria (`T7`) |

Para `F1_tarea`, `x_it` usa fases contiguas elegibles. Para predicciones de orientación observable, `x_it` usa la probabilidad congelada de `orientado_a_tarea`. No se usa únicamente la varianza de un score.

## 4. Separación de dinámica y ruido

Cada estimando temporal reportará, sin imputar:

1. pares elegibles totales;
2. pares incluidos;
3. pares cortados por calidad o iluminación;
4. pares cortados por gap o suspensión;
5. ventanas `no_observable` y su motivo;
6. pares cortados por cambio de perfil Edge;
7. valor dentro de segmentos homogéneos de calidad y perfil.

Un cambio observado inmediatamente alrededor de un cambio de perfil, fallo de calidad o gap no se atribuye a dinámica del participante. PR23 debe presentar por separado dinámica, validez de constructo y clasificación.

## 5. M1 sin `TBD`

M1 evalúa clasificación de orientación observable, nunca atención interna. El threshold se seleccionará exclusivamente en desarrollo como el umbral más bajo que alcance simultáneamente sensibilidad `>= 0.70` y especificidad `>= 0.80`; si ninguno existe, M1 falla y no se optimiza con el holdout.

Antes de abrir el holdout, M1 queda definido como candidato con estos mínimos conjuntos:

- límite inferior del IC95% de AUROC `>= 0.75`;
- sensibilidad `>= 0.70` en el threshold congelado;
- especificidad `>= 0.80` en el threshold congelado;
- mejora absoluta de AUPRC sobre la prevalencia del holdout `>= 0.15`;
- cobertura y denominadores publicados, con `no_observable` excluido de la clasificación binaria pero incluido en el reporte de cobertura.

Estos valores eliminan el `TBD` documental, pero requieren ratificación independiente D03 antes de aprobar G3.

## 6. Trazabilidad de la enmienda

- La v0.1 se conserva sin modificaciones como antecedente.
- La definición máquina-legible está en `PREREGISTRO_CONFIRMATORIO_v0.2.json`.
- El posicionamiento de novedad está en `REVISION_NOVEDAD_2026-09-15.md`.
- La ejecución de Ola 6 está delimitada en `../P0.5/PLAN_OLA6_v0.2.md`.
- Cualquier cambio posterior registra versión, motivo, estado de acceso a outcomes y nuevo hash.
