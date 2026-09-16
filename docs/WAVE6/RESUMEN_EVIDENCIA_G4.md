# Resumen de evidencia para Puerta G4

**Fecha de corte:** 2026-09-16

**Tramo evaluado:** PR19–PR24

**Estado propuesto:** revisión del gate pendiente

## Estado técnico

| Elemento | Evidencia | Estado |
| --- | --- | --- |
| PR19 baselines reproducibles | split por participante, umbral en validación, bootstrap | Implementado |
| PR20 modelo de estados | HMM versionado, incertidumbre, `no_observable` | Implementado |
| PR21 motor temporal | contrato estricto, idempotencia y límites | Implementado |
| PR22 rollout seguro | shadow, canary, fallback y rollback | Implementado |
| PR23 evaluación dinámica | protocolo congelado y evaluador reproducible | Implementado con evidencia sintética |
| PR24 baseline GRU | máscara, dos semillas, curvas y comparación | Implementado como candidato shadow |

La regresión final de PR24 ejecutó 62 pruebas ML sin fallos dentro de la imagen versionada del proyecto. No se activó ningún modelo, alias o intervención.

## Evidencia científica disponible

- El protocolo P0.3 v0.2 y los valores D03 fueron ratificados en G3.
- PR23 verifica técnicamente las métricas, denominadores, censura, contigüidad y doble bootstrap.
- PR24 compara PR19, PR20 y GRU sobre el mismo fixture y las mismas particiones.
- Toda la evidencia de rendimiento incluida en el repositorio es sintética.
- La evaluación confirmatoria con datos reales no fue ejecutada.
- La revisión independiente de splits, métricas y scripts de PR23 no fue ejecutada.

Por estas limitaciones, G4 no puede afirmar validez científica, superioridad de modelo, equidad ni preparación para despliegue.

## Selección recomendada para PR25

Se recomienda seleccionar **PR20 `observable-evidence-hmm-v1` únicamente como modelo de referencia para ingeniería de exportación y pruebas de paridad local**.

Razones:

- contrato explícito de estado observable e incertidumbre;
- tratamiento seguro de `no_observable` y cortes de segmento;
- coste estructural inferior al GRU;
- comportamiento reproducible y más interpretable;
- el GRU obtuvo especificidad sintética 0,75, inferior al mínimo 0,80.

Esta selección no declara que PR20 sea científicamente superior ni autoriza producción. El GRU permanece `shadow_only`, inactivo y sin intervención.

## Decisión recomendada

**G4 condicional para ingeniería**, con alcance limitado a iniciar PR25 bajo estas condiciones:

1. exportar PR20 como referencia local, sin activarlo para usuarios;
2. validar hash, compatibilidad, paridad y fallback antes de cualquier uso;
3. mantener `local_temporal_model` deshabilitado por defecto;
4. no enviar imágenes, video ni audio al servidor;
5. no promover GRU ni reajustar umbrales con el holdout;
6. conservar como pendientes la evaluación real y revisión independiente de PR23;
7. exigir una nueva decisión antes de piloto, intervención o afirmaciones de validez.

La alternativa conservadora es mantener G4 bloqueado hasta completar evaluación confirmatoria real y revisión independiente. La elección debe registrarla el revisor o propietario del gate.
