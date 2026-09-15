# PR29 — Autoinforme momentáneo

Se añade un instrumento neutral y opcional, versionado como `neutral-v1`, con respuestas `focused`, `distracted`, `unsure` y `omitted`. La omisión es una respuesta válida y la interfaz declara que no afecta el curso.

Cada solicitud usa UUID idempotente, sesión temporal, ventana opcional y tiempos de solicitud/respuesta. El contexto se limita a tipo y referencia opaca del recurso; no almacena texto académico ni respuestas de evaluación.

El control `MOMENTARY_SELF_REPORT=False` permanece apagado. El piloto cognitivo, frecuencia máxima y aprobación metodológica/ética siguen pendientes antes de participantes reales.
