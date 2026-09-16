# Revisión independiente requerida para PR23

**Estado:** NO EJECUTADA.

La ratificación externa de G3 congela el protocolo, pero no constituye revisión independiente de este código nuevo. Antes de aceptar resultados confirmatorios, una persona que no haya implementado PR23 debe revisar:

- asignación exclusiva por participante antes de crear ventanas;
- igualdad de ventanas elegibles entre modelo dinámico y baseline;
- exclusión de `no_observable` de clasificación y conservación en cobertura;
- selección del umbral solo en desarrollo;
- contigüidad, censura, denominadores de transiciones y métricas por participante;
- bootstrap por participante con ambas semillas;
- procedencia, hashes, versión de código y clasificación del conjunto de datos;
- separación entre clasificación, dinámica y validez del constructo.

El revisor debe registrar identidad funcional o rol, fecha, versión revisada, hallazgos y decisión. No deben incluirse nombres de participantes, secretos, imágenes, video ni datos crudos.
