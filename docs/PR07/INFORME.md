# PR07 — Protocolo y consentimiento v2

**Estado técnico:** CANDIDATO LOCAL  
**Estado humano:** `BLOCKED_HUMAN`  
**Fecha:** 2026-09-14  
**Base:** PR01 `14b7a8b0ae6233e6c555eca68704db2f1682399d`

## Resultado comprobado

Se añadió un registro de decisiones por participante, versión y finalidad. Cada decisión es un evento inmutable (`grant`, `decline` o `revoke`) y la vigencia se calcula desde el último evento de cada finalidad. La captura exige simultáneamente `local_processing` y `derived_persistence`; `research` permanece independiente. Expiración, versión anterior, revocación, flag desactivado o texto no aprobado producen denegación.

El backend deriva siempre el participante de la identidad autenticada. Docentes no pueden decidir por el estudiante ni consultar consentimiento, sesiones o eventos individuales de atención. El contrato expone `teacher_access=false` e `images_stored=false`. La ruta BFF comprueba la vigencia antes de aceptar un frame y el backend vuelve a comprobarla antes de persistir cualquier evento.

La interfaz comienza con las tres finalidades desactivadas, identifica el texto como borrador pendiente y ofrece continuar sin cámara tanto en cursos como en D2R. Revocar detiene la cámara y el siguiente intento de persistencia falla cerrado. El D2R puede ejecutarse sin cámara.

## Evidencia, inferencias y límites

### Evidencia comprobada

- `ConsentEvent` conserva finalidad, acción, versión, expiración, fuente y fecha.
- La API solo permite listar y crear eventos propios; no expone actualización ni eliminación.
- Nueve pruebas negativas y de ciclo de vida pasan con SQLite aislado.
- TypeScript y build pasan. El lint mantiene deuda basal y no se ocultó.
- El valor seguro `CONSENT_TEXT_APPROVED=False` impide habilitar captura en este candidato.

### Inferencias

- `participant` es todavía una FK operativa. La seudonimización o conservación separada de evidencia de consentimiento deberá fijarse con la política de retención.
- La comprobación doble reduce bypass desde UI, pero una sesión ya abierta descubre revocación remota en el siguiente envío. Una revocación hecha en la misma interfaz detiene la cámara inmediatamente.

### Preguntas abiertas y decisiones humanas

| Decisión | Responsable sugerido | Evidencia exigida | Estado |
| --- | --- | --- | --- |
| Aprobar texto, versión y periodo de vigencia | Ética + privacidad | Documento fechado y versionado | `BLOCKED_HUMAN` |
| Ratificar que la muestra incluye solo universitarios adultos | Dirección del estudio | Protocolo y criterios de inclusión firmados | `BLOCKED_HUMAN` |
| Aprobar conservación/pseudonimización del historial | Privacidad + custodio de datos | Política que cubra backups y borrado | `BLOCKED_HUMAN` |
| Revisar comprensión y accesibilidad del formulario | Investigación + accesibilidad | Lista de comprobación y prueba con usuarios sintéticos | `BLOCKED_HUMAN` |
| Sustituir transferencia de frames por procesamiento aprobado en dispositivo | Frontend + ML + privacidad | Prueba de red negativa y revisión PR05 | `BLOCKED_HUMAN` |

## Riesgos priorizados

1. **Crítico — texto sin aprobación.** Activar `CONSENT_TEXT_APPROVED` sin acta invalida el control. Propietario: gate owner G0/privacidad.
2. **Crítico — flujo heredado de frames.** La arquitectura actual transmite frames al BFF/ML; por eso este candidato mantiene captura cerrada. Propietario: PR05, frontend/ML/privacidad.
3. **Alto — retención de evidencia.** `PROTECT` evita borrar accidentalmente eventos, pero falta el procedimiento legal de seudonimización, backup y eliminación. Propietario: PR17/custodio.
4. **Medio — revocación en otra pestaña.** La cámara local se detiene al recibir el rechazo del siguiente envío, no mediante canal push. Propietario: PR05.
5. **Basal — lint.** El repositorio sigue rojo; debe mantenerse presupuesto de no regresión. Propietario: frontend.

## Rollback

Mantener `CONSENT_TEXT_APPROVED=False` y/o `CONSENT_V2_ENABLED=False`, detener la captura y conservar únicamente el historial administrativo permitido. Revertir UI/API no autoriza recuperar el flujo previo sin consentimiento. La migración se revierte solo después de respaldar o tratar legalmente la evidencia ya registrada.

## Criterios objetivos de aceptación de PR07

- [x] Finalidades separadas y versión comprobable.
- [x] Ausencia, expiración, versión anterior, revocación y flag inactivo fallan cerrado.
- [x] Eventos inmutables y participante derivado del JWT.
- [x] Alternativa sin cámara funcional en cursos y D2R.
- [x] Docente sin acceso individual en las superficies modificadas.
- [x] Pruebas específicas, migraciones, tipos y build pasan.
- [ ] Texto y vigencia aprobados por ética y privacidad.
- [ ] Revisión de accesibilidad y comprensión independiente.
- [ ] Flujo sin transmisión de material crudo demostrado antes de participantes.

PR07 puede integrarse técnicamente en Ola 1 para revisión. No autoriza participantes, despliegue, captura real ni aprobación de G0.
