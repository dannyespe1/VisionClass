# Resumen de evidencia para Puerta G5

**Fecha de corte:** 2026-09-16

**Tramo evaluado:** PR25–PR28, PR32 y PR34

**Recomendación:** `CONDITIONAL_PRODUCT_ENGINEERING_GO`

## Estado técnico

| Elemento | Evidencia | Estado |
| --- | --- | --- |
| PR25 inferencia local | exportación determinista, paridad y fallback | Implementado e inactivo |
| PR26 telemetría de dispositivo | métricas minimizadas sin material crudo | Implementado |
| PR27 scheduler adaptativo | histéresis, fallback y rollback fijo | Implementado e inactivo |
| PR28 benchmark y Pareto | matriz reproducible y límites por clase | Implementado con fixture sintético |
| PR32 validez y acuerdo | kappa, asociaciones, calibración y faltantes | Implementado con fixture sintético |
| PR34 equidad | métricas, intervalos, supresión y gate | Implementado con fixture sintético y promoción bloqueada |

La regresión final de PR34 ejecutó 94 pruebas ML: 93 correctas y un fallo heredado por comparación LF/CRLF del exportador web, reproducido en la base anterior. No se habilitó ningún modelo, panel, bóveda, intervención ni transmisión de medios crudos.

## Evidencia pendiente

- No existe evaluación confirmatoria con participantes reales en el repositorio.
- No se aportó evidencia real de suficiencia de muestra ni suficiencia por grupo.
- Las reproducciones independientes de PR32 y PR34 no fueron ejecutadas.
- PR33 permanece apagado y pendiente de revisión independiente de reidentificación y rol PostgreSQL separado.
- PR34 devuelve `BLOCK_PROMOTION_SYNTHETIC_ONLY`.
- No está establecida la validez del constructo, equidad, generalización ni preparación para despliegue.

## Decisión de alcance

La solicitud del propietario de continuar permite recomendar un avance condicional de ingeniería, no una aprobación científica o de producción. El alcance autorizado es construir PR35–PR37 con datos sintéticos, estados vacíos y feature flags apagados.

Condiciones:

1. Los paneles permanecen deshabilitados por defecto.
2. No se usan datos reales, atributos demográficos ni joins con la bóveda.
3. Toda interfaz distingue observación, inferencia, autoinforme y resultados académicos.
4. Se muestran incertidumbre, cobertura, `no_observable`, fuentes y limitaciones.
5. No se crean rankings, diagnósticos, etiquetas permanentes ni vigilancia individual.
6. Pausa, revocación y política de datos deben ser accesibles.
7. PR38 y cualquier intervención continúan bloqueados hasta aprobación específica de seguridad.
8. Producción, piloto y afirmaciones de validez/equidad requieren una nueva decisión con evidencia real e independiente.

## Recomendación

`CONDITIONAL_PRODUCT_ENGINEERING_GO` exclusivamente para iniciar PR35. Si alguna implementación necesita datos reales, habilitar flags o omitir controles de privacidad, G5 vuelve a `HOLD`.
