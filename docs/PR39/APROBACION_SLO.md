# Aprobación de SLO y límites — PR39

Fecha: 17 de septiembre de 2026  
Fuente: confirmación explícita del propietario en la tarea de Codex  
Estado: `APPROVED_BY_OWNER`

## Decisión

- disponibilidad mensual: 99%;
- presupuesto de indisponibilidad en 30 días: 432 minutos;
- la ventana de mantenimiento planificada consume ese presupuesto;
- latencia API: p95 ≤750 ms y p99 ≤1500 ms;
- readiness: p95 ≤500 ms;
- recuperación: backend/Redis ≤120 s y base de datos/modelo ≤300 s;
- carga objetivo: máximo 1% de error;
- carga pico: máximo 2% de error;
- alertas, propietarios y acciones: aprobados.

La aprobación no activa `PRODUCTION_OBSERVABILITY`, no autoriza piloto o producción y no sustituye el soak test en infraestructura candidata. No se atribuye revisión independiente porque esa condición no fue indicada en la confirmación.
