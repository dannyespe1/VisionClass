# Ola 6 v0.2 — Ejecución condicionada por G3

**Fecha:** 2026-09-15  
**Estado:** definición preparada; ejecución bloqueada hasta aprobación verificable de G3  
**Orden:** `PR19 → PR20 → PR21 → PR22 → PR23 → PR24`

## Contrato común

- La unidad de split es el participante y el split ocurre antes de generar ventanas.
- Se conservan separados desempeño de tarea, autoinforme, anotación observable, características visuales, calidad y estados derivados.
- `no_observable` nunca es distracción, clase negativa ni cero.
- Los modelos representan estados de evidencia u orientación observable con incertidumbre; no atención interna.
- Todas las comparaciones usan los mismos splits, señales, reglas de faltantes y métricas congeladas en P0.3 v0.2.
- No hay decisiones, intervenciones ni consecuencias educativas en Ola 6.

## PR19 — Baselines reproducibles

Baselines estáticos y heurísticos bajo split por participante, semillas y configuración versionadas. Deben establecer referencias reproducibles de clasificación, calibración y cobertura sin presentar un score visual como ground truth.

## PR20 — HMM o espacio de estados

Representar estados latentes de evidencia u orientación observable, con distribución posterior, incertidumbre y tratamiento explícito de gaps y `no_observable`. Estados y emisiones no reciben interpretación cognitiva.

## PR21 — Motor temporal

Consumir ventanas versionadas y producir como máximo una inferencia efectiva por evento. Persistir versión, probabilidades, incertidumbre, calidad, perfil Edge e identificador idempotente; manejar duplicados, orden y compatibilidad.

## PR22 — Shadow mode y rollback

Toda salida temporal permanece en shadow mode. Debe existir apagado, rollback auditable y prueba de que ninguna salida activa decisiones o intervenciones.

## PR23 — Evaluación separada

Evaluar, con las reglas P0.3 v0.2, cambio, volatilidad, persistencia, transiciones, episodios, recuperación, calibración, cobertura, demora de cambio y condiciones de fallo. Los resultados separan:

1. dinámica temporal;
2. clasificación de orientación observable;
3. validez del constructo;
4. ruido de calidad, iluminación, gaps, `no_observable` y perfil Edge.

## PR24 — Baseline temporal neuronal

GRU o LSTM como baseline temporal bajo exactamente los mismos splits, señales, máscaras, métricas y reglas de cobertura de PR19–PR23. Permanece como candidato en shadow mode.

## Continuidad hacia Ola 7

- PR25: inferencia local y paridad del artefacto.
- PR26: medición minimizada de recursos.
- PR27: scheduler con latencia, energía, cobertura e incertidumbre; histéresis obligatoria y restricciones inviolables de privacidad/consentimiento.
- PR28: benchmark y frontera de Pareto.
- PR32: validez y acuerdo.
- PR34: auditoría de equidad.

Este documento no abre G3. La evidencia pendiente se mantiene en `../WAVE5/G3_DECISION_REQUIRED.md`.

