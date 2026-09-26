# Manual de anotación v2 — candidato para piloto

Este manual implementa la enmienda prospectiva P0.3 v0.3. No habilita por sí
solo datos reales, entrenamiento ni intervenciones. `OBSERVER_ANNOTATION` debe
permanecer apagado hasta completar las aprobaciones y preparación del piloto.

## Unidad de observación

Cada anotador observa el mismo participante durante una ventana de 5 segundos
controlada por el servidor. La respuesta puede registrarse después, pero su
latencia no desplaza la ventana. Anotaciones con ventanas distintas no se unen
mediante una tolerancia de ±15 segundos.

## Categorías

- `attentive`: orientación observable compatible con la tarea definida.
- `distracted`: orientación observable fuera de la tarea definida.
- `no_observable`: no existe evidencia visual suficiente; exige un motivo.
- `uncertain`: existe evidencia visible, pero no permite elegir justificadamente
  una de las dos orientaciones.

Los nombres técnicos históricos `attentive` y `distracted` no autorizan mostrar
“atento” o “distraído” como estado cognitivo. La interfaz debe usar “orientación
compatible con la tarea” y “orientación fuera de la tarea”.

## Motivos válidos de `no_observable`

- `sin_rostro`
- `oclusion`
- `iluminacion`
- `multiples_personas`
- `fallo_dispositivo`
- `material_fuera_de_pantalla`
- `retiro_consentimiento`
- `otro_especificado`

La aplicación y la base de datos rechazan `no_observable` sin uno de estos
motivos. Esta categoría nunca equivale a conducta fuera de tarea.

## Cegamiento y adjudicación

Los observadores no ven predicciones, scores, autoinformes, resultados académicos
ni la respuesta del otro observador. Las etiquetas originales son inmutables. Un
desacuerdo se conserva y, cuando el protocolo lo permita, se adjudica en un
registro separado por una persona designada que documenta versión del manual,
fecha y motivo.

El segundo observador necesita un permiso ético vigente cuyo `cohort_scope`
incluya `course:<id>` para el curso observado. Un permiso de otro proyecto o curso
no autoriza la asignación ni el envío.

## Criterio del piloto

El piloto utiliza 15–20 participantes separados de las cohortes posteriores. El
acuerdo requerido es kappa de Cohen >= 0.80 y límite inferior del IC95% bootstrap
por participante >= 0.67, además de las verificaciones de privacidad, cobertura,
carga de trabajo y reproducción independiente definidas en P0.3 v0.3.
