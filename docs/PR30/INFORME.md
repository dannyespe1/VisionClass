# PR30 — Interacción académica minimizada

Se registran aperturas, pausas, reanudaciones, navegación, actividad y microevaluaciones como evidencia separada de los estados inferidos. Cada evento usa UUID idempotente, sesión temporal, timestamp, tipo de recurso y referencia opaca.

El payload prohíbe texto, respuestas, correo, nombre y título. No existe campo de estado de atención. `LEARNING_INTERACTION_EVENTS=False` mantiene la captura apagada hasta consentimiento, retención y revisión aplicables.
