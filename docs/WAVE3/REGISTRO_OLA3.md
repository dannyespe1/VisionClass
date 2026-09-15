# Registro de integración — Ola 3

**Fecha:** 2026-09-15  
**Base de Ola 2:** `7449b07250a513f02aebc57203a70ec05cac9256`  
**Expediente G1:** `08dff65`  
**Estado:** `TECHNICAL_PASS_BLOCKED_HUMAN`

El usuario autorizó explícitamente continuar el desarrollo técnico de Ola 3. Esta autorización habilita PR08–PR10, pero no se registra como aprobación ética, institucional, metodológica ni de privacidad. Se mantienen cero participantes autorizados, todos los flags apagados, sin despliegue y sin datos reales.

## Commits integrados

| PR | Rama fuente | Commit fuente | Commit integrado | Resultado |
| --- | --- | --- | --- | --- |
| PR08 | `pr08-observaciones-estados` | `3d306e2` | `b889620` | esquema temporal aditivo y reversible |
| PR09 | `pr09-registro-modelos` | `dfc1feb` | `c02f75d` | registro de modelos con hashes y estados |
| PR10 | `pr10-contrato-eventos-v2` | `aab4704` | `4a6ce27` | contrato v2 y fixtures compartidos |

## Controles de activación

- `TEMPORAL_SCHEMA_V2=False`
- `MODEL_REGISTRY=False`
- `EVENT_CONTRACT_V2=False`

Los cambios de esquema son expansivos. El flujo v1 permanece disponible y no se migraron ni reinterpretaron datos históricos.

## Verificación integrada

- Django `check`: PASS.
- Deriva de migraciones: PASS, sin cambios pendientes.
- Suite backend completa: PASS, 39/39.
- Migraciones `0015` y `0016`: PASS adelante, atrás hasta `0014` y nuevamente adelante, usando SQLite temporal.
- Frontend: 9/9 pruebas Node, typecheck PASS y build PASS.
- ML: 5/5 pruebas de identidad y contrato.
- Compilación Python backend/ML: PASS.
- Lint global: `FAIL_BASELINE`, 69 errores y 43 advertencias; no aumentó frente a la línea base registrada en PR05.
- Compose: NO EJECUTADO; faltan `backend/.env` y otros archivos locales, que no deben copiarse entre worktrees.
- `npm ci`: PASS; auditó 17 vulnerabilidades de dependencias existentes (1 baja, 4 moderadas, 11 altas y 1 crítica). No se ejecutó `npm audit fix` porque cambiar dependencias está fuera del alcance.

## Riesgos y próximos gates

Antes de activar cualquier flag o usar participantes se requieren las aprobaciones humanas pendientes de G0/G1, CI con Python 3.11 y Node 20, revisión de las vulnerabilidades de dependencias, E2E de privacidad/captura y verificación integrada de observabilidad. El siguiente paso del plan después de PR10 es PR29, no una activación productiva.
