# PR37 — Panel de investigación protegido

## Alcance

PR37 añade un panel exclusivo para cuentas con rol `researcher` y una concesión aprobada, vigente, con aprobación ética, propósito y alcances explícitos. La función permanece apagada por defecto mediante `RESEARCH_DASHBOARD=False` y `NEXT_PUBLIC_RESEARCH_DASHBOARD=false`.

El panel admite filtros por cohorte, versión de modelo, perfil de ejecución y periodo. Cada cifra publicada conserva procedencia de modelo, contrato de características, referencia de datos, revisión de código y versión de inferencia. Validez y equidad se presentan únicamente como evidencia registrada; la ausencia de referencia se muestra como `not_linked` y nunca se transforma en una afirmación favorable.

## Controles de privacidad y acceso

- Una solicitud histórica o declarativa no autoriza acceso: la concesión debe estar vinculada a la cuenta autenticada.
- Los datos requieren consentimiento de investigación vigente por participante.
- Las celdas con menos de 20 participantes, menos de 100 ventanas observables o incertidumbre incompleta se suprimen sin revelar conteos exactos.
- No se une la bóveda demográfica y no se exponen identificadores operativos, características, probabilidades ni material crudo.
- La exportación exige una sola cohorte, modelo y perfil; usa seudónimos de investigación, propósito idéntico al aprobado y un enlace de un solo uso con caducidad máxima de 30 minutos.
- El token de descarga se almacena sólo como SHA-256. En cada descarga se vuelven a verificar concesión, caducidad, consentimiento y mínimos de muestra.
- Accesos, rechazos, creación, descarga y revocación se registran en la auditoría de seguridad.

## Operación

1. Crear una cuenta con rol `researcher` desde administración.
2. Registrar y aprobar una concesión con `principal`, `purpose`, `expires_at`, `cohort_scope`, `model_scope` (`nombre:versión`) y `profile_scope`.
3. Completar la revisión independiente usando `REVISION_EXPORTACION.md`.
4. Habilitar ambos flags sólo en el entorno autorizado y verificar un conjunto sintético o explícitamente aprobado y minimizado.
5. Mantener bloqueadas las afirmaciones de validez o equidad que no tengan informe registrado.

## Rollback

1. Cambiar ambos flags a `false`.
2. Revocar las concesiones afectadas (`status=rejected`) y marcar los enlaces pendientes con `revoked_at`.
3. Conservar auditorías y revisar las exportaciones ya descargadas según el expediente y la política de retención.
4. No revertir destructivamente la migración mientras existan concesiones o auditorías que deban preservarse.

## Gate G5

La implementación de producto es condicional. No habilita despliegue piloto o productivo ni demuestra validez/equidad. Sólo admite datos sintéticos, vacíos o datos minimizados explícitamente aprobados dentro del alcance del expediente. La revisión independiente de acceso/exportación y la verificación de comprensión quedan como evidencia manual obligatoria antes de activar los flags.
