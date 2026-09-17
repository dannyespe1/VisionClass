# PR35 — Panel de evidencia del estudiante

## Alcance implementado

PR35 incorpora un panel personal por sesión que separa observación, inferencia técnica, estado `no_observable` y autoinforme. No presenta un puntaje global, rankings, diagnósticos ni etiquetas permanentes. La vista nueva reemplaza el panel heredado de estadísticas únicamente cuando ambos flags están habilitados:

- backend: `STUDENT_ATTENTION_DASHBOARD=True`;
- frontend: `NEXT_PUBLIC_STUDENT_ATTENTION_DASHBOARD=true`.

Los dos flags permanecen apagados por defecto. La decisión G5 vigente sólo permite ingeniería de producto condicionada; no autoriza producción, piloto ni afirmaciones científicas.

## Contrato de API

`GET /api/student-evidence-dashboard/`

- requiere autenticación y rol `student`;
- obtiene la identidad exclusivamente del usuario autenticado;
- limita el resultado a las 12 sesiones más recientes del participante;
- no devuelve identificadores de usuario, curso, sesión, modelo, probabilidades ni características crudas;
- convierte etiquetas heredadas (`attentive` y `distracted`) y ventanas sin inferencia a `unknown`;
- calcula cobertura e incertidumbre sólo a partir de estados de evidencia observable;
- devuelve estados de interfaz `empty`, `partial` o `ready`;
- falla con `404` cuando el flag está apagado y con `403` para roles distintos de estudiante.

La fecha de inicio se incluye para ordenar la tendencia personal. `label` es sólo una posición cronológica dentro de las sesiones devueltas; no es una clasificación del estudiante.

## Privacidad y controles

El panel muestra si la captura está autorizada, declara que no se almacenan imágenes y que la vista no habilita acceso docente individual. El control **Pausar y revocar captura** registra revocaciones mediante el contrato de consentimiento existente para `local_processing` y `derived_persistence`. La política ampliada está enlazada en `/privacidad`.

La revocación detiene autorizaciones futuras; la política de retención/eliminación de datos derivados ya persistidos continúa gobernada por PR14 y no se redefine aquí.

## Interpretación permitida

- “Orientada a la tarea” y “fuera de la tarea” describen evidencia observable de una ventana.
- `no_observable` significa que la señal fue insuficiente.
- `unknown` cubre datos parciales, inferencia ausente o etiquetas heredadas que no pueden reinterpretarse con seguridad.
- La incertidumbre no debe tratarse como confianza psicológica ni como medida de aprendizaje.

## Rollback

1. Establecer `NEXT_PUBLIC_STUDENT_ATTENTION_DASHBOARD=false` y volver a desplegar el frontend.
2. Establecer `STUDENT_ATTENTION_DASHBOARD=False` en el backend.
3. Mantener disponibles la información de privacidad y el flujo de consentimiento existente.

El rollback no elimina datos ni debilita autorización o consentimiento.

## Verificación manual pendiente

La sesión de comprensión con usuarios representativos no fue ejecutada. Antes de habilitar el panel fuera de un entorno de ingeniería se debe verificar, como mínimo, que las personas puedan explicar con sus propias palabras:

1. la diferencia entre observación, inferencia y autoinforme;
2. que `no_observable` no es un resultado negativo;
3. que ninguna métrica representa una capacidad personal o diagnóstico;
4. qué ocurre al revocar la captura;
5. dónde consultar la política de datos.

Registrar rol del facilitador, perfil agregado de participantes sin identificadores, guion, hallazgos y cambios resultantes. No almacenar grabaciones ni respuestas identificables sin una base y autorización específicas.
