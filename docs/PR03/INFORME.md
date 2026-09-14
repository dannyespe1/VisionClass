# PR03 — Identidad estricta para eventos y predicciones

- **Estado:** IMPLEMENTADO LOCALMENTE — NO DESPLEGADO
- **Base:** PR01 `14b7a8b0ae6233e6c555eca68704db2f1682399d`
- **Flag:** `STRICT_EVENT_IDENTITY=True` por defecto
- **Gate:** G0 continúa `BLOQUEADA`; cero participantes autorizados.

## Evidencia comprobada

- `student_id` y `user_id` se reciben solo como reclamos de compatibilidad. Django los compara con el JWT y deriva las relaciones persistidas del usuario autenticado.
- Una sesión de curso nueva requiere rol estudiante, curso activo y matrícula activa; `started_at` se fija en el servidor.
- Eventos, vistas de contenido, intentos de quiz y predicciones requieren una sesión del mismo estudiante, matrícula activa, ausencia de `ended_at` y antigüedad máxima configurable.
- El BFF valida JWT, rol, propiedad de sesión y curso; sustituye `user_id` por `/api/me/`, crea la clave idempotente y reenvía el JWT al servicio ML.
- El servicio ML reenvía autenticación e `Idempotency-Key` a Django. La autoridad final sigue siendo Django.
- `AttentionEvent` y `D2RAttentionEvent` tienen unicidad por sesión y clave idempotente. Un replay retorna 409 y no vuelve a actualizar agregados.
- Los rechazos generan `SecurityAuditEvent` inmutable con actor protegido, código de razón y referencia técnica; no guarda payload, token, email, nombre ni contenido observado.

## Inferencias y límites

- Los clientes antiguos que no envíen `Idempotency-Key` dejarán de persistir eventos. El BFF actualizado la genera; consumidores externos deben adoptar el contrato.
- La cuenta técnica ML histórica no sirve como identidad de participante bajo modo estricto. PR04 debe definir su alcance mínimo; el camino BFF usa el JWT del participante mientras tanto.
- La vigencia predeterminada de ocho horas es un límite técnico inicial, no una decisión del protocolo.

## Rollback seguro

Ante incompatibilidad, configurar `STRICT_EVENT_IDENTITY=False` suspende la escritura y predicción afectadas. No se debe restaurar confianza en IDs del cuerpo. Revertir código requiere revertir también la migración únicamente después de comprobar que no existen eventos con claves nuevas ni auditorías que deban conservarse.

## Criterios

- [x] Identidad y rol derivados del JWT.
- [x] Sesión vinculada a estudiante, curso, matrícula y vigencia.
- [x] Reclamos discordantes rechazados con 403.
- [x] Sesiones ajenas o expiradas y roles insuficientes rechazados.
- [x] Replay rechazado con 409 y agregación única.
- [x] Predicción valida la misma frontera de sesión.
- [x] Auditoría sin payload ni secretos.
- [x] Flag falla de forma cerrada.
- [ ] Revisión independiente de seguridad e integración de Ola 1.

## Referencias

- [ADR PR01](../PR01/ADR-0001-ARQUITECTURA-OBJETIVO.md)
- [Verificación](VERIFICACION.json)
