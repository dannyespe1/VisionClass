# P0.4 — Runbook de no despliegue, suspensión y rollback

**Versión:** 0.1
**Uso:** piloto shadow de VisionClass
**Estado:** procedimiento propuesto; requiere responsables nominados y simulacro

## 1. Preflight obligatorio

Antes de cada sesión, el operador registra hora, artefactos/digests, configuración, gates y responsables. La sesión no comienza si una respuesta es negativa:

1. G04-0 a G04-6 están `PASS` y no vencidos.
2. Participantes elegibles son adultos y tienen consentimiento vigente para cada finalidad.
3. El modo es `shadow_visual`; reglas de dificultad, riesgo y notificación no reciben score.
4. El kill switch detiene captura/inferencia sin deshabilitar autenticación o revocación.
5. Readiness extremo a extremo está verde y los presupuestos conservan al menos 50%.
6. Cola, almacenamiento de crudos y DLQ visual están vacíos.
7. Responsable técnico, privacidad y director de guardia están localizables.
8. Digest anterior seguro, procedimiento de rollback y compatibilidad de esquema están verificados.

## 2. Clasificación

### SEV-0 — privacidad, identidad o daño

Incluye captura sin consentimiento, menor admitido, acceso cruzado, secreto/PII expuesto, frame persistido, pérdida de revocación, salida usada para sanción/diagnóstico o indicio de daño.

Acción: suspensión inmediata sin esperar confirmación estadística.

### SEV-1 — integridad o indisponibilidad grave

Incluye mezcla de participantes, corrupción, pérdida/duplicación sobre límite, OOM, error semántico >5%/5 min, cola fuera de límite, presupuesto agotado o rollback imposible.

Acción: congelar ingreso y detener captura; preservar evidencia mínima.

### SEV-2 — degradación controlada

Incluye burn rate ≥2/15 min, latencia, cobertura o recursos en umbral preventivo sin exposición ni corrupción.

Acción: no iniciar nuevas sesiones; las activas pasan a core sin cámara si es seguro.

## 3. Respuesta cronometrada

| Desde detección | Acción | Responsable primario | Evidencia |
|---|---|---|---|
| 0–5 min | activar kill switch; detener captura, inferencia y nuevos ingresos | operador/técnico | hora, métrica y estado del switch |
| 0–15 min | aislar servicio/revisión afectada; revocar credenciales si aplica; preservar logs sin payload | técnico + privacidad | digest, alcance y credenciales revocadas |
| 0–30 min | desplegar digest seguro anterior o mantener core sin cámara | técnico | comando/proveedor, digest y smoke test |
| ≤60 min | reconciliar eventos críticos, consentimientos y participantes afectados | custodio de datos | conteos antes/después y discrepancias |
| ≤24 h | decisión preliminar de notificación y postmortem | director + privacidad/ética | acta y responsables |
| ≤48 h | cerrar G04-8 o mantener suspensión | aprobadores G04-8 | evidencia de restore/eliminación y acciones |

No se copian datos personales a chats, correo o tickets. Se usan identificadores de incidente y participantes seudónimos.

## 4. Orden seguro de suspensión

1. Bloquear nuevas sesiones y nuevas capturas.
2. Detener productores de frames; descartar slots pendientes y buffers en memoria.
3. Mantener disponibles consentimiento, revocación, cierre de sesión y contacto humano.
4. Deshabilitar consumidores de score y comprobar cero cambios en quiz, riesgo o notificaciones.
5. Aislar revisión defectuosa; conservar métricas, hashes y logs mínimos.
6. Revocar secretos/tokens solo cuando se sospeche exposición o para aislar el componente.
7. Reconciliar eventos críticos con claves idempotentes; no reintentar imágenes.

## 5. Elección del rollback

| Caso | Acción predeterminada |
|---|---|
| fallo solo visual | core sin cámara; no sustituir por score histórico o cero |
| regresión de aplicación | volver al digest firmado anterior compatible |
| cambio de configuración | restaurar configuración firmada y documentar diferencia |
| migración compatible | volver aplicación; mantener esquema compatible |
| corrupción de datos | detener escrituras y restaurar solo tras diagnóstico/restore ensayado |
| secreto expuesto | rotar/revocar, invalidar sesiones necesarias y luego recuperar servicio |
| proveedor caído | mantener congelamiento; el fallo consume presupuesto |

Nunca usar `git reset`, borrar evidencia, aplicar una migración destructiva o restaurar toda la BD como respuesta automática.

## 6. Smoke test posterior

- login y autorización fallan de forma cerrada;
- adulto sin consentimiento de cámara puede usar el flujo básico permitido;
- cámara no abre, no transmite y no quedan buffers;
- revocación sigue accesible y persistida;
- no se producen scores, eventos visuales, recomendaciones ni notificaciones automáticas;
- un participante no puede leer/escribir datos de otro;
- readiness del core y persistencia crítica cumplen SLO;
- logs no contienen token, PII, imagen ni payload.

Si cualquiera falla, se mantiene la suspensión.

## 7. Reanudación

Requiere causa raíz, corrección revisada, pruebas negativas, carga aplicable, presupuesto restablecido, nueva evidencia del gate afectado y firma del mismo aprobador. SEV-0 requiere además revisión de privacidad/ética. No se reanuda para “obtener más datos” ni se relajan umbrales después de observar el fallo.

## 8. Registro mínimo del incidente

- ID, severidad, inicio/detección/cierre y quién decidió;
- versión, digest, configuración y proveedor;
- SLI, numerador, denominador y presupuesto consumido;
- alcance de participantes/datos sin identidad directa;
- consentimiento y revocaciones afectados;
- acciones, comandos y resultados;
- evidencia de descarte de buffers, cola, réplicas y backups según P0.2;
- causa raíz, controles fallidos, responsables y fechas;
- decisión de reanudar, reducir alcance o terminar el piloto.
