# Acta G1 para revisión independiente

**Fecha de preparación:** 2026-09-15  
**Commit evaluado de Ola 2:** `7449b07250a513f02aebc57203a70ec05cac9256`  
**Estado actualizado:** `USER_AUTHORIZED_TECHNICAL_ADVANCE` — el usuario autorizó continuar PR08–PR10 el 2026-09-15. La revisión ética, institucional y de privacidad independiente permanece `BLOCKED_HUMAN`; no se autorizan participantes, datos reales ni despliegue.

## Alcance evaluado

La integración contiene PR01, PR03, PR07, PR02, PR04, PR05 y PR06. No se realizó despliegue, reclutamiento, captura con participantes ni tratamiento de datos reales. El número de participantes autorizados continúa en cero.

## Evidencia técnica disponible

| Unidad | Evidencia | Resultado registrado |
| --- | --- | --- |
| Ola 1 | `docs/WAVE1/VERIFICACION.json` | `TECHNICAL_PASS_BLOCKED_HUMAN` |
| PR02 | `docs/PR02/VERIFICACION.json` | pruebas de routing, backend, tipos y build pasan; lint conserva fallo de línea base |
| PR04 | `docs/PR04/VERIFICACION.json` | pruebas backend/ML y verificador pasan; revisión de seguridad independiente pendiente |
| PR05 | `docs/PR05/VERIFICACION.json` | cola acotada y verificaciones pasan; E2E navegador y revisión de privacidad pendientes |
| PR06 | `docs/PR06/VERIFICACION.json` | health checks revisados estáticamente; ejecución en runtime objetivo pendiente |
| Ola 2 | `docs/WAVE2/VERIFICACION.json` | integración documentada con limitación de entorno |

## Bloqueos para aprobar G1

1. G0 continúa bloqueada y no existe aprobación independiente de ética, privacidad, metodología e institución.
2. PR01 y PR07 conservan decisiones humanas pendientes; el texto de consentimiento no está aprobado.
3. Falta ejecutar la integración completa en CI con Python 3.11 y Node.js 20 sobre el mismo SHA.
4. El lint global sigue fallando por deuda de línea base; requiere excepción explícita y temporal o remediación.
5. PR05 carece de E2E de navegador que demuestre cancelación, liberación de cámara, heap estable y ausencia de transmisión cruda.
6. PR06 no tiene todavía evidencia ejecutada de disponibilidad, tasa de error y p95 en un entorno integrado.
7. Falta una segunda persona o equipo con autoridad real para revisar y aprobar el último cambio.

## Decisión requerida

El aprobador independiente debe seleccionar exactamente una opción:

- [ ] `PASS`: todas las evidencias obligatorias están adjuntas al mismo SHA y los bloqueos anteriores están cerrados.
- [ ] `PASS_WITH_ACTIONS`: únicamente si las acciones no afectan seguridad, privacidad, validez, consentimiento ni criterios de entrada a PR08; detallar responsable y fecha.
- [ ] `FAIL`: indicar hallazgos bloqueantes y criterio objetivo de repetición.

**Nombre/rol del aprobador:** ____________________________________  
**Fecha:** __________________  
**Decisión:** __________________  
**Commit revisado:** ____________________________________________  
**Acciones y vencimientos:** ____________________________________

## Regla de avance

PR08 puede comenzar solo cuando G1 figure como `PASS` verificable sobre el commit evaluado. La aprobación del tesista o de Codex no sustituye una revisión independiente. Mientras el estado sea `BLOCKED_HUMAN`, únicamente se permite preparar evidencia y corregir defectos sin usar datos reales.
