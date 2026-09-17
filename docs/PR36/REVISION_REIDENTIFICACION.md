# Revisión humana requerida — PR36

Esta plantilla no constituye aprobación. Debe ser completada por una persona independiente de la implementación antes de habilitar el panel.

## Ataques que debe intentar la revisión

- comparar `all` con `90d`, `all` con `30d` y `90d` con `30d`;
- combinar curso y periodo para buscar una cohorte conocida de menos de 20 personas;
- comparar puntos semanales solapados y no solapados;
- usar conocimiento auxiliar de matrículas, horarios, ausencias o actividades únicas;
- inferir una referencia interna de actividad desde el orden de etiquetas genéricas;
- reconstruir contribuciones mediante conteos de ventanas, cobertura, bandas o redondeo;
- consultar cursos ajenos, identificadores malformados y roles no docentes;
- observar cambios cuando se añade o elimina una sola persona o ventana.

## Criterios mínimos de aceptación

- ninguna combinación libera métricas de menos de 20 participantes o 100 ventanas observables;
- ninguna resta entre respuestas permite aislar contribuciones de 1 a 19 participantes;
- una actividad suprimida no expone su conteo exacto ni métricas parciales;
- no aparecen nombres, correos, identificadores de participante ni referencias de actividad;
- el docente no puede convertir el panel en una lista o ranking individual;
- los mensajes no presentan la inferencia como medición de atención, aprendizaje o estado mental.

## Comprensión docente

La persona facilitadora debe comprobar que docentes representativos pueden explicar:

1. qué significan cobertura, incertidumbre y `no_observable`;
2. por qué una actividad puede estar suprimida;
3. que el intervalo es descriptivo y no causal;
4. que el panel no permite evaluar ni contactar a un alumno concreto;
5. que ausencia de evidencia no equivale a ausencia de una dificultad.

Registrar sólo resultados agregados y hallazgos minimizados. No almacenar grabaciones, nombres o datos de estudiantes sin una autorización específica.

## Decisión

- Revisor independiente: **PENDIENTE**
- Fecha: **PENDIENTE**
- Resultado: **NO EJECUTADO**
- Hallazgos y mitigaciones: **PENDIENTE**
- Autorización de habilitación: **NO**
