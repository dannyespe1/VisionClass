# PR36 — Panel docente de evidencia grupal

## Alcance

PR36 añade un panel por actividad para docentes que muestra únicamente agregados protegidos de cobertura, incertidumbre, distribución e intervalos descriptivos. Cuando el flag está habilitado, sustituye las vistas heredadas que exponían análisis por estudiante.

Los flags permanecen apagados por defecto:

- backend: `TEACHER_GROUP_DASHBOARD=False`;
- frontend: `NEXT_PUBLIC_TEACHER_GROUP_DASHBOARD=false`.

La decisión G5 vigente autoriza ingeniería condicionada con datos sintéticos, vacíos o explícitamente aprobados y minimizados. No autoriza producción, piloto, vigilancia, intervención ni afirmaciones de validez o equidad.

## Fuente y unidad

El endpoint `GET /api/teacher-group-dashboard/` usa eventos de interacción académica de PR30 vinculados a una ventana temporal. Agrupa por curso, tipo de recurso y referencia interna de actividad, pero la referencia interna nunca sale en la respuesta. Las actividades se presentan como etiquetas genéricas dentro de cada curso.

Para cada ventana se usa la inferencia más reciente. Las etiquetas heredadas o ausentes se convierten en `unknown`; no se reinterpretan como evidencia positiva o negativa.

- cobertura: ventanas con evidencia observable sobre ventanas totales;
- orientación: promedio de la proporción por participante, para evitar que quien aporta más ventanas domine el agregado;
- `no_observable` y `unknown`: proporciones sobre ventanas;
- incertidumbre: media sobre todas las ventanas observables, exigida sin faltantes;
- intervalo: aproximación normal descriptiva del 95 % sobre promedios por participante; no es una prueba confirmatoria.

## Controles contra reidentificación

1. Sólo el rol `teacher` puede consultar el endpoint.
2. El servidor deriva los cursos desde `Course.owner`; un curso ajeno responde `404`.
3. Se requieren al menos 20 participantes totales, 20 con evidencia observable y 100 ventanas observables.
4. Los mínimos se fijan con un piso técnico: variables de entorno menores no reducen 20/100.
5. Un grupo pequeño no publica conteos, bandas, distribuciones, intervalos ni calidad parcial.
6. Los conteos de participantes publicados se reemplazan por bandas (`20-39`, `40-79`, `80+`).
7. Los filtros se limitan a curso y periodos cerrados `30d`, `90d` o `all`.
8. La supresión complementaria bloquea un periodo cuando compararlo con otro permitiría aislar contribuciones de entre 1 y 19 participantes.
9. Cada punto semanal repite los mínimos completos; un punto insuficiente aparece suprimido.
10. No se devuelven participantes, estudiantes, correos, referencias internas, probabilidades, características ni modelos.

## Interpretación y rollback

El panel describe señales observables de actividades, no estados mentales, aprendizaje ni capacidad personal. No contiene rankings, perfiles individuales, alertas por alumno ni acciones automáticas.

Rollback:

1. configurar `NEXT_PUBLIC_TEACHER_GROUP_DASHBOARD=false` y reconstruir el frontend;
2. configurar `TEACHER_GROUP_DASHBOARD=False` en backend;
3. conservar los mínimos y la autorización aunque el frontend se encuentre deshabilitado;
4. retirar cualquier captura o reporte derivado que haya sido liberado incorrectamente y ejecutar revisión de incidente.

No existe migración ni modificación destructiva de datos.

## Pendientes obligatorios antes de habilitar

- revisión independiente de riesgo de reidentificación;
- sesión de comprensión con docentes representativos;
- prueba de carga con volumen aprobado y minimizado;
- decisión nueva basada en evidencia para cualquier uso productivo o piloto.

Hasta completar estos puntos, la promoción permanece bloqueada.
