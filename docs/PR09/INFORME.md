# PR09 — Registro de modelos y artefactos

El registro conserva metadatos reproducibles: nombre y versión, SHA-256 del artefacto, URI externa, algoritmo, contrato de características, referencia de dataset, revisión de código, métricas, umbrales y evaluación. PostgreSQL no almacena el binario.

Los estados permitidos son `candidate`, `validated`, `active`, `retired` y `blocked`. Solo puede existir una versión activa por nombre. Las versiones validadas o activas requieren evidencia de evaluación y el hash debe ser SHA-256 válido.

`InferredState.model_artifact` enlaza una inferencia con el registro mediante `PROTECT`; es nullable durante la transición para mantener compatibilidad con datos históricos y con el flag `MODEL_REGISTRY=False`. Antes de activar el flag se debe completar el backfill autorizado y verificar que nuevas inferencias no usen la referencia textual heredada.

Rollback: apagar el flag y conservar todos los registros. Retirar un artefacto cambia su estado; no borra inferencias históricas ni el metadato de auditoría.
