# PR16 — Normalización de características v1

## Contrato

`normalized-features-v1` fija coordenadas y tamaños en rangos normalizados, ángulos en `[-1, 1]`, confianza en `[0, 1]`, timestamps ISO-8601 UTC y ventanas deterministas de 5 segundos. Los valores ausentes son `null`; cero conserva su significado medido y no representa ausencia.

Cada evento v2 incluye `extractor_version` y `preprocessing_version` dentro de `device`. El flag `NEXT_PUBLIC_NORMALIZED_FEATURES_V1` permanece apagado por defecto.

## Consistencia

TypeScript y Python ejecutan el mismo fixture dorado sintético, incluida una rotación de 90 grados. También se prueban rostro parcial, valores ausentes y construcción del evento v2. Cambiar nombres, rangos, orientación o ventanas exige una nueva versión; los eventos anteriores se enrutan por su `preprocessing_version`.

## Seguridad y alcance

El contrato contiene solo números o `null`; no admite imágenes, blobs ni identificadores enviados por el cliente fuera del sobre autenticado. PR16 prepara el evento normalizado en memoria. Su persistencia o consumo no se activa todavía, por lo que no se crea un canal transitorio sin la puerta de calidad de PR17.

## Rollback

Apagar `NEXT_PUBLIC_NORMALIZED_FEATURES_V1` conserva la extracción local de PR15 sin mezclar versiones. No se reinterpretan eventos históricos.
