# Protocolo operativo del candidato

## Participantes del ensayo técnico

El único recorrido autorizado usa identidades sintéticas: una cuenta administradora, una docente, dos estudiantes y una investigadora. No se reclutan personas ni se procesan datos reales.

Un piloto posterior necesita una nómina cerrada, institución y curso aprobados, responsable legal, consentimiento del representante cuando aplique, asentimiento del estudiante, autorización institucional y canal de retirada. Ninguna persona se incorpora por defecto.

## Responsables mínimos

- `pilot-owner`: autoriza inicio, pausa, reanudación y cierre;
- `incident-commander`: coordina incidentes y rollback;
- `on-call`: atiende disponibilidad y latencia;
- `privacy-officer`: decide contención y notificación de privacidad;
- `database-owner`: backup, restauración e integridad;
- `ml-owner`: desactiva inferencia y conserva fallback seguro;
- `support-owner`: recibe incidencias de participantes sin solicitar material crudo.

Antes de activar un piloto deben registrarse nombres, alternos y canales institucionales fuera del repositorio.

## Comunicación de incidentes

- severidad 1: privacidad, seguridad, integridad o consentimiento; suspensión inmediata y aviso a `pilot-owner` y `privacy-officer`;
- severidad 2: indisponibilidad o degradación sostenida; congelar cambios, informar al `incident-commander` y aplicar runbook;
- severidad 3: problema funcional sin riesgo de datos; registrar, ofrecer alternativa y programar corrección.

Nunca se adjuntan imágenes, video, tokens, nombres ni payloads de participantes a tickets o chats.

## Suspensión obligatoria

Suspender ante consentimiento inválido, transmisión de material crudo, acceso no autorizado, reidentificación, pérdida de integridad, vulnerabilidad crítica explotable, agotamiento del presupuesto SLO, intervención no aprobada o rollback no verificable. La reanudación requiere evidencia de corrección y decisión explícita del `pilot-owner`.
