# Activación persistente del piloto en Render

## Alcance autorizado

Este cambio materializa en el Blueprint la aprobación registrada en
`docs/PILOT_APPROVAL/EVIDENCE.json` y el preflight completo de
`docs/PILOT_PREFLIGHT/RESULTS.json`.

Se activan conjuntamente:

- calibración local obligatoria antes de acceder al curso;
- extractor y normalización local de características;
- puerta de calidad y perfiles EDGE;
- inferencia GRU en `shadow_only` y envío exclusivo del resultado derivado;
- doble anotación humana independiente;
- panel de investigación agregado sujeto a concesión y mínimos de privacidad.

Permanecen apagados el panel individual de atención del estudiante, el panel grupal inferencial
del profesor y las intervenciones conservadoras. No se autoriza transmitir o almacenar imágenes,
video, audio, landmarks ni material visual crudo.

## Artefacto canónico

El `preDeployCommand` registra de forma idempotente el artefacto
`masked-gru-observable-evidence:masked-gru-observable-evidence-v1-synthetic`. El comando falla si
esa misma versión aparece con un SHA-256 distinto.

Este registro no cambia su naturaleza: continúa siendo un candidato sintético, no validado y
exclusivo de shadow. Los datos del piloto alimentarán una nueva versión de dataset y un nuevo
artefacto; nunca se sobrescribirá esta versión.

## Rollback

1. Definir `NEXT_PUBLIC_EDGE_SHADOW_REPORTING`, `NEXT_PUBLIC_RESEARCH_DASHBOARD`,
   `NEXT_PUBLIC_OBSERVER_ANNOTATION` y `NEXT_PUBLIC_RESEARCH_SESSION_CALIBRATION_REQUIRED` en
   `false`, y reconstruir el frontend.
2. Definir `EDGE_SHADOW_REPORTING`, `RESEARCH_DASHBOARD`, `OBSERVER_ANNOTATION` y
   `RESEARCH_SESSION_CALIBRATION_REQUIRED` en `False`, y redesplegar el backend.
3. Si se requiere detener todo el piloto, definir también `PILOT_RELEASE=False` y
   `NEXT_PUBLIC_PILOT_RELEASE=false`.
4. Conservar artefactos, concesiones, auditorías y datos autorizados según la política de
   retención; el rollback no elimina registros.

## Camino para abandonar la condición sintética

1. Congelar un dataset autorizado y versionado con etiquetas humanas dobles, procedencia y
   consentimiento vigentes.
2. Resolver desacuerdos según el protocolo sin usar la predicción del modelo como etiqueta.
3. Separar desarrollo y confirmación por participante antes de construir ventanas.
4. Entrenar un artefacto nuevo reproducible con semillas, configuración, código y SHA-256.
5. Compararlo con baselines y reportar cobertura, `no_observable`, calibración, incertidumbre,
   sensibilidad, especificidad, AUROC, AUPRC y métricas por grupo cuando la muestra lo permita.
6. Evaluarlo sobre la cohorte confirmatoria no usada en entrenamiento y obtener revisión
   independiente.
7. Registrar una versión nueva con su `dataset_reference` real y evidencia de evaluación. Solo un
   gate posterior puede cambiar su elegibilidad; no se renombra ni se promociona el candidato
   sintético actual.
