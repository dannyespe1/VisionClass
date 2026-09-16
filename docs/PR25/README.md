# PR25 — Inferencia temporal local de referencia

PR25 exporta `observable-evidence-hmm-v1` de PR20 a un formato Web determinista y añade un runtime JavaScript con paridad controlada. El alcance aprobado por G4 es exclusivamente de ingeniería: el modelo continúa deshabilitado y no se conecta al recorrido del estudiante.

## Controles

- Flag: `NEXT_PUBLIC_LOCAL_TEMPORAL_MODEL`, apagado por defecto.
- Formato: `visionclass-temporal-web-v1` sobre CPU JavaScript.
- Cuantización: no aplicada.
- Integridad: longitud y SHA-256 sobre los bytes exactos antes de parsear el artefacto.
- Origen: solo rutas del mismo origen con credenciales `same-origin`.
- Compatibilidad: versión, estados, dimensiones, probabilidades y contrato de ejecución validados.
- Privacidad: consume una probabilidad observable derivada; no recibe ni transmite imágenes, frames, video o audio.
- Seguridad: toda salida mantiene `allow_intervention=false`.

El artefacto incluido es sintético y está clasificado `engineering_parity_only`. No tiene firma operativa: el manifiesto registra `not_signed_engineering_only`, y el cargador lo rechaza salvo un override explícito utilizado únicamente por las pruebas. La ausencia de firma bloquea cualquier activación o distribución productiva.

## Fallback

Flag apagado, hash incorrecto, tamaño distinto, versión incompatible, origen externo, falta de WebCrypto o artefacto no elegible producen un fallback local. El fallback devuelve `no_observable`, incertidumbre máxima y nunca llama a inferencia remota.

## Paridad

`PARITY_FIXTURES.json` se genera con el filtro Python de PR20. La prueba Node compara estado, motivo de reset, posterior y entropía con tolerancia absoluta `1e-12`, incluyendo ventanas observables, `no_observable` y gap superior a 7,5 segundos.

## Reproducción

```powershell
python -m ml.export_state_model_web --input docs/PR20/SYNTHETIC_STATE_MODEL.json --artifact-output frontend/public/models/temporal-reference.v1.json --manifest-output frontend/public/models/temporal-reference.v1.manifest.json --fixture-input docs/PR25/PARITY_INPUT.json --fixture-output docs/PR25/PARITY_FIXTURES.json
node --test frontend/tests/pr25-local-temporal-model.test.mjs
```

## Rollback

Mantener el flag apagado y retirar el runtime, el exportador y los artefactos PR25. El servicio temporal existente no cambia y no existe fallback de imágenes o inferencia hacia el servidor.
