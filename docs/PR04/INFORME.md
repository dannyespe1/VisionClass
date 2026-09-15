# PR04 — Mínimo privilegio del servicio ML

- **Estado:** CANDIDATO TÉCNICO — NO DESPLEGADO
- **Fecha:** 2026-09-14
- **Base:** Ola 1 `82f80da95b11bd204d4d650b94ff44e0fab9cde8`
- **Gate:** G0 continúa `BLOQUEADA`; cero participantes y cero datos reales.
- **Propietarios sugeridos:** backend y seguridad; operación para custodiar y rotar secretos.

## Resultado comprobado

La llamada BFF→ML usa una credencial de servicio conservada solo en el servidor Next.js y el scope `frames:analyze`. El JWT del estudiante se usa en el BFF para validar identidad, sesión, curso y consentimiento, pero ya no sale hacia ML. Si falta la credencial, el BFF no transmite el frame.

ML→Django usa otra credencial y el endpoint interno `/api/internal/ml/events/`, limitado a `events:write`. Django deriva al participante desde la sesión; rechaza `user_id`, datos con claves de medios crudos, payloads mayores a 16 KiB, sesiones inválidas, consentimiento no vigente y replays. La identidad ML no es una cuenta de usuario y no puede administrar usuarios ni cursos.

Los scopes del ingreso ML son `frames:analyze`, `events:consume` y `models:read`. `/health` permanece público y no expone configuración; `/debug/status` requiere `models:read`. Cada par admite token actual y anterior para rotación solapada. Retirar el anterior lo revoca de inmediato.

## Evidencia, inferencias y preguntas abiertas

### Evidencia comprobada

- Pruebas Django cubren token actual, rotación, revocación, ausencia, flag apagado, scope incorrecto, identidad reclamada, medios crudos, replay y revocación de consentimiento.
- Pruebas unitarias puras cubren autenticación y scopes del ingreso FastAPI.
- `create_ml_service_user` queda retirado y no crea administradores ni imprime secretos.
- Los ejemplos de entorno contienen nombres vacíos; no se versionó ningún valor de credencial.

### Inferencias

- La rotación sin interrupción requiere coordinar despliegues en el orden descrito en el runbook; no se ejecutó contra un gestor de secretos real.
- Los logs estructurados permiten contar denegaciones sin registrar token, payload, usuario, sesión o frame. PR06 añadirá correlación y métricas.

### Preguntas abiertas

- El custodio debe elegir el gestor de secretos institucional y demostrar control de acceso y auditoría.
- Debe fijarse la vigencia máxima de cada credencial y la ventana operativa de solapamiento.
- PR05 debe retirar la capacidad heredada `SAVE_FRAMES` y acotar solicitudes antes de admitir pruebas integradas de captura.

## Riesgos priorizados

| Prioridad | Riesgo residual | Control actual | Responsable y evidencia para cerrar |
| --- | --- | --- | --- |
| Crítica | No existen secretos reales ni gestor configurado | Ausencia falla cerrada | Operación/seguridad: inyección y rotación en staging aislado |
| Alta | El servicio aún acepta frames crudos autorizados y conserva código `SAVE_FRAMES` | Endpoint autenticado; valor ejemplo 0 | PR05 + privacidad: prueba de cero persistencia |
| Alta | La rotación no fue ensayada entre servicios desplegados | Doble slot probado unitariamente | Operación: evidencia temporal del procedimiento completo |
| Media | Scopes viven en configuración y podrían ampliarse | Defaults mínimos y pruebas negativas | Seguridad: revisión de manifiestos y alertas ante cambio |

## Rollback

Desactivar el procesamiento ML afectado y mantener el BFF en respuesta cerrada. No restaurar la cuenta administrativa ni reenviar JWT de estudiantes. Ante una credencial comprometida, vaciar el slot anterior, sustituir el actual siguiendo el runbook y revisar denegaciones; no reactivar hasta verificar ambos enlaces.

## Criterios objetivos de aceptación

- [x] El JWT del estudiante no se envía a ML.
- [x] La identidad ML no es usuario, staff ni administrador.
- [x] BFF→ML y ML→Django usan secretos distintos y solo de servidor.
- [x] Cada endpoint exige el scope documentado.
- [x] Ausencia, scope incorrecto, revocación o flag apagado fallan cerrados.
- [x] Django deriva identidad desde la sesión y exige consentimiento.
- [x] Los logs de seguridad omiten secretos, PII, identificadores de sesión y payloads.
- [x] Existe procedimiento de rotación, revocación y rollback seguro.
- [ ] Rotación integrada demostrada en entorno controlado con gestor de secretos.
- [ ] Revisión independiente de seguridad.

