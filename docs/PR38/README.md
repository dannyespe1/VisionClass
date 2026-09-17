# PR38 — Intervenciones conservadoras basadas en reglas

## Arquitectura

El motor vive en Django y recibe únicamente `session_id`. El servidor deriva identidad, matrícula, sesión temporal, consentimiento, contexto académico y evidencia. El cliente nunca decide si existe evidencia suficiente y no envía estados, incertidumbre, rol o usuario.

La ruta `POST /api/interventions/evaluate/` permanece oculta cuando `CONSERVATIVE_INTERVENTIONS=False`. Aun con el flag activo, `INTERVENTION_ALLOWED_MODEL_REFERENCES` debe contener versiones exactas; una allowlist vacía falla de forma cerrada. El frontend requiere adicionalmente `NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS=true`.

## Regla v1

La sugerencia sólo se presenta cuando se cumplen simultáneamente todas las condiciones:

1. cuenta estudiante, sesión propia activa y matrícula vigente;
2. al menos cinco minutos desde el inicio de la sesión;
3. consentimiento vigente para procesamiento local y persistencia derivada;
4. material actual comprobado en base de datos y distinto de una evaluación;
5. seis ventanas recientes y consecutivas con señal explícitamente observable;
   cada ventana dura entre cinco y diez segundos y no se solapa con la anterior;
6. seis estados `off_task_evidence`, incertidumbre individual ≤0,30;
7. mismo modelo, versión de inferencia, perfil y generación;
8. modelo incluido en la allowlist operativa;
9. sin reutilizar evidencia, dentro de los límites por sesión, día y enfriamiento.

`unknown`, `no_observable`, señal ambigua, huecos, datos futuros, evidencia antigua, cambios de modelo/perfil, consentimiento inválido o contexto no verificable producen supresión. La respuesta no expone características, probabilidades, ventanas o identificadores de inferencia.

## Separación respecto de ML

PR38 no cambia `allow_intervention=false` en PR17, PR21 o PR25. Ese campo sigue declarando que una inferencia aislada no puede intervenir. El motor de reglas evalúa una secuencia persistente bajo su propia política, aprobación y kill switch.

No se usa LLM. Las tres variantes están versionadas en código, son opcionales, no atribuyen un estado mental y no generan aviso docente o consecuencia académica.

## Auditoría y rollback

Cada solicitud registra `allowed`, `suppressed` o `denied` con un código no identificador. Una presentación conserva política, regla, digest de evidencia, cantidad de ventanas, umbral, modelo, versión y perfil, sin características ni probabilidades.

Rollback inmediato:

1. establecer `CONSERVATIVE_INTERVENTIONS=False` y `NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS=false`;
2. vaciar `INTERVENTION_ALLOWED_MODEL_REFERENCES`;
3. conservar registros y auditoría para revisión;
4. volver a orientación general/manual sin reactivar reglas anteriores.

Una sugerencia ya visible se retira ante el siguiente fallo de evaluación o al detener cámara/persistencia, cambiar a evaluación o cerrar la sesión. Ningún rollback permite intervención desde ML.
