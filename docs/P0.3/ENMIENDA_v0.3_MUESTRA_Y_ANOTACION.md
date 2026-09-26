# P0.3 v0.3 — Enmienda prospectiva de muestra y anotación sincronizada

**Fecha:** 2026-09-24
**Versiones anteriores conservadas:** v0.1 y v0.2
**Estado:** candidato prospectivo pendiente de sello y ratificación independiente
**Acceso a outcomes o scores reales antes de esta enmienda:** no declarado en este archivo
**Entrenamiento, intervención o conclusión confirmatoria autorizados por esta enmienda:** no

## 1. Decisión muestral

El estudio se ejecutará en dos cohortes que no se solapan:

1. **Piloto operativo y de anotadores:** entre 15 y 20 participantes. Sirve para comprobar consentimiento, plataforma, temporización, cobertura, manual, concordancia y carga de trabajo. Sus participantes y resultados no se reutilizan para entrenar, seleccionar umbrales ni calcular métricas confirmatorias.
2. **Estudio de desarrollo y confirmación:** exactamente 100 participantes distintos del piloto. Antes de inspeccionar outcomes, se congela una sola de estas divisiones por participante:
   - 60 desarrollo / 40 confirmación; o
   - 70 desarrollo / 30 confirmación.

`desarrollo` incluye entrenamiento, validación interna agrupada por participante, selección de arquitectura, calibración y selección del threshold. `confirmación` es un holdout bloqueado hasta congelar modelo, preprocesamiento, variables, threshold y plan de análisis. No se permite cambiar de 60/40 a 70/30 después de examinar resultados.

El tamaño inferencial se expresa en participantes. Ventanas, frames, fases o sesiones repetidas no aumentan `N`.

## 2. Asignación reproducible y pseudonimizada

- La asignación se ejecuta con `ml.study_cohort_plan.create_cohort_plan` sobre UUID opacos emitidos por la bóveda de pseudónimos de investigación. El validador rechaza alias legibles, nombres, matrículas y correos.
- El archivo identificable que relaciona cuenta, correo e identidad académica permanece en la bóveda restringida y nunca se entrega al proceso de partición o entrenamiento.
- El manifiesto público conserva conteos, referencia de semilla y hashes, pero no pseudónimos individuales.
- La partición ocurre antes de crear ventanas. Todas las ventanas y sesiones de un participante permanecen en una sola partición.
- Se bloquea cualquier solapamiento entre piloto, desarrollo y confirmación.

## 3. Ventana humana sincronizada

Para el ground truth de orientación observable se adopta inicialmente una ventana de observación humana de **5 segundos**. Esta ventana queda anidada dentro de la fase o actividad correspondiente y no reemplaza las unidades de desempeño de tarea definidas en v0.1/v0.2.

El manual operativo correspondiente es `docs/PR31/MANUAL_ANOTACION_V2.md`.

- Profesor y segundo observador reciben el mismo participante y los mismos timestamps de inicio y fin controlados por el servidor.
- La latencia al pulsar una etiqueta se registra por separado; no desplaza retrospectivamente la ventana observada.
- No se emparejan anotaciones realizadas en ventanas diferentes mediante una tolerancia de ±15 segundos.
- La rotación operativa candidata usa grupos de hasta 10 participantes y pretende una observación individual aproximadamente cada 3 minutos. La frecuencia real, faltantes y desviaciones se publican; no se fabrican ventanas ausentes.
- Los dos observadores no ven predicciones, scores, autoinformes, quiz, historial ni respuesta del otro.

## 4. Etiquetas y adjudicación

Las etiquetas canónicas son:

- `orientado_a_tarea`;
- `orientado_fuera_de_tarea`;
- `no_observable`, con motivo obligatorio;
- `incierto`.

Estas categorías describen conducta visible y no atención interna. `no_observable` e `incierto` nunca se convierten en negativos, ceros o distracción.

Las dos etiquetas originales son inmutables. Cuando exista desacuerdo, una adjudicación independiente se guarda en un campo nuevo con adjudicador, timestamp, manual, motivo y referencia a ambas etiquetas. Para el análisis deben publicarse resultados con consenso estricto y un análisis de sensibilidad según la regla de adjudicación congelada.

## 5. Criterios antes de abandonar el piloto

El piloto no se considera superado solo por alcanzar 15 participantes. Debe verificarse:

- flujo completo de consentimiento y revocación;
- ausencia de imagen, video, audio, nombre o correo en tráfico y dataset científico;
- dos anotaciones independientes sobre la misma ventana;
- motivos explícitos de `no_observable`;
- kappa de Cohen `>= 0.80` y límite inferior del IC95% bootstrap por participante `>= 0.67`, según el criterio ya aprobado;
- cobertura, tiempos de observación, carga del observador y fallos técnicos;
- procedimiento reproducible de partición y bloqueo del holdout;
- revisión independiente del manual y de una reproducción del análisis.

Si el manual cambia después del piloto, se versiona. Si el cambio afecta la definición del target, los participantes utilizados para desarrollarlo siguen excluidos de la cohorte posterior.

## 6. Límites de interpretación

El piloto permite afirmar viabilidad técnica y operativa, no rendimiento científico. El holdout permite estimar rendimiento de clasificación de orientación observable bajo el protocolo congelado, pero no demuestra que la cámara mida atención interna ni que una intervención mejore el aprendizaje. Esa última afirmación requiere un estudio de intervención separado.

## 7. Decisiones todavía requeridas

- Elegir y sellar **una** división: 60/40 o 70/30.
- Registrar la semilla o referencia pública utilizada para la asignación.
- Designar al segundo observador y al adjudicador independiente.
- Ratificar que el piloto es adicional a los 100 participantes posteriores.
- Aprobar el calendario de retención y acceso al archivo de correspondencia identificable.
