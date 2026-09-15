# Registro versionado — Ola 1

**Ola:** Arquitectura, identidad y consentimiento
**Fecha:** 2026-09-14
**Rama de integración:** `wave1-integracion`
**Estado técnico:** `PASS`
**Estado de cierre:** `BLOCKED_HUMAN`
**G0:** `BLOQUEADA`
**Participantes autorizados:** 0

## Contenido integrado

| Unidad | Rama fuente | SHA fuente | SHA en integración | Resultado |
| --- | --- | --- | --- | --- |
| PR01 | `pr01-arquitectura-objetivo-v2` | `14b7a8b0ae6233e6c555eca68704db2f1682399d` | mismo commit base | Arquitectura candidata documentada; G0 bloqueada |
| PR03 | `pr03-identidad-estricta` | `baba50bd9c8d08a33204dddd0cd9c5e2e09e8881` | `89ece8874ff446619f83ce0dd6b176b54ad4897c` | Identidad derivada, sesiones validadas, idempotencia y auditoría |
| PR07 | `pr07-consentimiento-v2` | `03a17e3dc96d016b3e360dc113307427f9d672a6` | `96eb7dd674c76de0a7d036c5b3ae221a641e2f24` | Consentimiento versionado, revocable, por finalidad y alternativa sin cámara |

PR02 (`8ae22574f6c346edb268033a2b42a49521476c6b`) permanece **ADELANTADO/PARCADO** para Ola 2. No es ancestro de esta rama ni fue cherry-picked.

El cherry-pick de PR07 se creó desde `191c5da1a21efcd73eaca9cffa66c4199adc6430`. La rama fuente se enmendó luego a `03a17e3dc96d016b3e360dc113307427f9d672a6` solo para retirar espacios finales del informe y regenerar su hash. Esta integración incorpora esos dos archivos normalizados en el commit de registro; el código de producto es idéntico.

## Resoluciones de integración

1. En `backend/api/views.py`, la validación de identidad y sesión de PR03 se ejecuta antes de comprobar consentimiento; la persistencia exige ambas condiciones.
2. Las migraciones independientes `0013_identity_audit_and_event_idempotency` y `0013_consentevent` se unen mediante `0014_merge_pr03_pr07`, sin operaciones de datos.
3. Las pruebas de identidad reciben consentimiento sintético vigente. Esto preserva el objetivo del test de replay sin debilitar el cierre por consentimiento.
4. El BFF valida JWT, rol, propiedad de sesión y curso, después consulta consentimiento y solo entonces reenvía al servicio ML.

## Evidencia combinada

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Instalación frontend | `PASS_LOCAL` | `npm --prefix frontend ci`, 556 paquetes; Node 22.17.1 local |
| Instalación backend aislada | `PASS_LOCAL` | `python -m pip install -r backend/requirements.txt`; Python 3.12.14 local |
| Django check | `PASS` | Sin problemas de sistema |
| Deriva de migraciones | `PASS` | `No changes detected` y merge de hojas presente |
| Pruebas Django | `PASS` | 16/16, identidad + consentimiento |
| Compilación Python/ML | `PASS` | `compileall` sin salida |
| TypeScript | `PASS` | `tsc --noEmit` |
| Build frontend | `PASS` | Next.js generó 13 rutas; requirió red para Geist |
| Lint completo | `FAIL_BASELINE` | 70 errores y 44 advertencias; P0.1: 71/45 |
| Lint de archivos nuevos de consentimiento/BFF | `PASS` | ESLint sin hallazgos |
| Compose | `PASS` | `docker compose config` con `.env.example` temporal; sin levantar servicios |
| Verificador PR01 | `PASS` | Arquitectura candidata; G0 bloqueada |
| Verificador PR03 | `PASS` | Identidad, sesiones, replay y auditoría |
| Verificador PR07 | `PASS` | Contrato, cierre seguro y alternativa |
| Gobernanza y G0 | `PASS` | Estructura válida y G0 verificada como bloqueada |
| Secretos/PII en cambios de la ola | `PASS` | Sin credenciales ni datos reales; identificadores citados son nombres de campos/controles |
| Despliegue e integración con servicios | `NO_EJECUTADA` | Fuera de alcance; no se autorizó despliegue ni datos reales |
| CI en runtimes objetivo | `BLOCKED_ENV` | Falta ejecutar el mismo SHA con Node 20 y Python 3.11 según `AGENTS.md` |

## Riesgos priorizados y responsables sugeridos

| Prioridad | Riesgo residual | Responsable sugerido | Evidencia para cerrar |
| --- | --- | --- | --- |
| Crítica | El servicio ML heredado puede recibir y procesar frames crudos antes de que el backend rechace la persistencia | Frontend + ML + privacidad, PR04/PR05 | Acceso restringido, procesamiento aprobado y prueba negativa de red |
| Crítica | Texto de consentimiento y versión siguen sin aprobación | Ética + privacidad | Acta independiente, fechada y versionada |
| Alta | G0 carece de aprobadores independientes y ratificaciones institucionales | Gate owner G0 | Acta de aprobación por una persona distinta del tesista |
| Alta | Historial de consentimiento usa FK operativa con `PROTECT`; falta política de seudonimización, backups y borrado | Custodio + privacidad, PR17 | Política aprobada y prueba de restore/borrado |
| Alta | La cuenta/rol de servicio ML y su mínimo privilegio siguen pendientes | Backend + seguridad, PR04 | Token de servicio restringido y pruebas negativas |
| Media | Lint general permanece rojo | Frontend | Presupuesto de no regresión e issue con propietario/fecha |
| Media | Dependencias vulnerables/no reproducibles de G0 no fueron remediadas en esta ola | Responsables DEP-FE/BE/ML | Auditorías limpias o excepciones aprobadas y fechadas |
| Media | Validación local usó Python 3.12.14 y Node 22.17.1, no los runtimes CI fijados | DevOps/CI | Checks del SHA integrado en Python 3.11 y Node 20 |

## Decisiones pendientes

- Ética y privacidad deben aprobar el texto, versión, vigencia y retiro antes de cambiar `CONSENT_TEXT_APPROVED=False`.
- La dirección del estudio debe ratificar por escrito que participan únicamente estudiantes universitarios adultos.
- Arquitectura, privacidad y ML deben aprobar una frontera que evite salida de frames crudos del dispositivo antes de cualquier participante.
- El gate owner debe revisar evidencia de P0.1–P0.5 y Ola 1; la aprobación no puede provenir solo del tesista.
- GitHub requiere verificación humana de branch protection, CODEOWNERS, checks e issues publicados.

## Rollback

Mantener `CONSENT_TEXT_APPROVED=False` conserva la captura cerrada. Para retirar PR07 se revierte su commit de integración sin recuperar el flujo previo inseguro; para retirar PR03 se suspende por completo la escritura de eventos. La migración de consentimiento no debe bajarse después de registrar decisiones hasta definir conservación legal. El rollback de Ola 1 vuelve al commit PR01 y mantiene cero participantes y ningún despliegue.

## Veredicto

La composición PR01 + PR03 + PR07 es un **candidato técnico PASS**, pero **Ola 1 no está cerrada**. Permanece `BLOCKED_HUMAN`, G0 sigue `BLOQUEADA` y no se autoriza comenzar Ola 2, desplegar, reclutar ni tratar datos reales.
