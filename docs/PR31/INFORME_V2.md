# PR31 v2 — Flujo operativo de doble anotación ciega

## Alcance implementado

El flujo convierte la estructura técnica original de PR31 en una operación de
piloto protegida por dos flags, ambos apagados por defecto:

- backend: `OBSERVER_ANNOTATION=False`;
- frontend: `NEXT_PUBLIC_OBSERVER_ANNOTATION=false` y `PILOT_RELEASE=false`.

El profesor propietario programa una ventana para un estudiante matriculado con
sesión activa y consentimiento vigente. El segundo observador debe ser
investigador, tener aprobación ética vigente y un `cohort_scope` que contenga
`course:<id>`. El servidor fija cinco segundos y crea dos asignaciones sobre la
misma `ObservationWindow`.

## Separación de identidad

La preparación del profesor pertenece a la capa académica: puede listar nombres
de estudiantes matriculados en su propio curso. La ejecución de la anotación
pertenece a la capa de investigación: profesor y revisor reciben únicamente un
código opaco `VC-...`, timestamps y su propio `assignment_id`.

El segundo observador nunca recibe nombre, correo, id académico, features,
predicciones, autoinformes, resultados de quiz o la respuesta del profesor.

## Secuencia del servidor

1. Verifica flag, rol, propiedad del curso, matrícula y sesión activa.
2. Verifica consentimiento vigente para procesamiento, persistencia derivada e
   investigación.
3. Verifica permiso ético y alcance del segundo observador.
4. Crea una ventana idempotente de cinco segundos, sin material crudo.
5. Presenta estados `scheduled`, `observing` y `ready`.
6. Rechaza respuestas antes del final de la ventana o después de la gracia.
7. Guarda una única anotación inmutable por asignación.
8. Informa solamente si el par está pendiente o completo; no revela acuerdo ni
   categoría del otro observador.

Una revocación de consentimiento o del permiso del revisor bloquea el envío aunque
la ventana ya haya sido creada.

## Persistencia y auditoría

La migración `0027_observer_annotation_no_observable_reason.py` exige que
`no_observable` tenga un motivo del manual v2. Cada programación y anotación crea
un evento de auditoría sin PII. Las anotaciones originales no se editan ni se
eliminan mediante el modelo; los procesos institucionales de retiro/retención
continúan usando borrado controlado por lote.

## Rollback

1. Mantener o restaurar ambos flags en `false`.
2. Detener nuevas programaciones y envíos; no borrar evidencia existente.
3. Conservar la migración, porque refuerza integridad y es compatible con las
   categorías anteriores distintas de `no_observable`.
4. Aplicar el procedimiento de retención o retiro cuando corresponda.

## Límites

La implementación no aprueba el piloto, el modelo ni las intervenciones. Antes de
activar los flags se requiere ratificación de P0.3 v0.3, selección del split,
segundo observador designado, revisión de comprensión, prueba manual con dos
cuentas y autorización del tratamiento real.
