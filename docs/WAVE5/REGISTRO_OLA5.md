# Registro de integración — Ola 5

**Fecha:** 2026-09-15  
**Base:** `571f709` (Ola 4 con smoke Redis completo)  
**Código integrado:** `bb687ac`
**Estado:** `TECHNICAL_COMPLETE_G3_BLOCKED_HUMAN_AND_SCIENTIFIC`

## Commits

| PR | Fuente | Integrado | Resultado |
| --- | --- | --- | --- |
| PR15 | `fe32188` | `ae56bf5` | extracción local, liberación de recursos y eliminación de subida de frames del flujo normal |
| PR16 | `cf30af0` | `d866fba` | normalización v1 y fixture dorado TypeScript/Python |
| PR17 | `e8bdf22` | `2e1e251` | puerta de calidad, no observable y bloqueo de inferencia/intervención |
| PR18 | `17576df`, `7afc212`, `b028544` | `5ca7e61`, `8669dcd`, `bb687ac` | perfiles Edge acotados, generación de ventana e ingesta normalizada autorizada |

## Verificación integrada

- Backend: 66/66 pruebas PASS sobre SQLite en memoria.
- ML: 13/13 pruebas PASS con datos sintéticos.
- Frontend: 25/25 pruebas Node, typecheck y build PASS.
- Migraciones: sin deriva; avance completo, reversión `0021 → 0019` y reaplicación `0019 → 0021` PASS en SQLite desechable. El archivo fue eliminado.
- Python compile y `git diff --check`: PASS.
- Lint global: 66 errores y 43 advertencias; la línea base anterior era 69/43. La Ola 5 no añade deuda y elimina tres errores previos del flujo de cámara.
- Dependencias npm: permanecen 17 vulnerabilidades informadas por la instalación bloqueada; actualizarlas queda fuera del alcance de esta ola.
- Pruebas manuales con cámara, múltiples dispositivos, suspensión real y navegadores objetivo: pendientes; requieren hardware/interacción y consentimiento aplicable.

## Seguridad y activación

`NEXT_PUBLIC_BROWSER_EXTRACTOR`, `NEXT_PUBLIC_NORMALIZED_FEATURES_V1`, `NEXT_PUBLIC_QUALITY_GATE_V1` y `NEXT_PUBLIC_EDGE_PROFILES` permanecen en `false`. El modo predeterminado es sin captura. No existe fallback de subida de imágenes.

La canalización genera un sobre JSON v2 con números o `null`, razón de calidad, versiones y perfil. Con autorización explícita del usuario se implementó su envío a `/api/observations/`: el backend deriva identidad del token, exige sesión activa y consentimiento vigente, aplica una lista blanca exacta, rechaza imágenes y campos como `user_id`, y persiste una `Observation` idempotente sujeta a PR14. Los controles permanecen apagados por defecto. No hubo datos reales, participantes, despliegue, entrenamiento, evaluación ni interpretación de modelos.

## Salida

El código local de PR15–PR18 está integrado y probado. La Ola 5 queda técnicamente completa, pero no habilita operación ni abre G3. Antes de iniciar PR19 deben resolverse las decisiones científicas e institucionales de `G3_DECISION_REQUIRED.md` y las pruebas manuales de compatibilidad.
