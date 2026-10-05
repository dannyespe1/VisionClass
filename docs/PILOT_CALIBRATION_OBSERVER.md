# Preparación de calibración y observación para el piloto

## Estado de aprobación

El código queda preparado con controles cerrados por defecto. El equipo informó una aprobación verbal del protocolo; la evidencia documental continúa pendiente y debe registrarse antes de activar las banderas productivas. Este documento no sustituye esa aprobación.

## Calibración local

- Cuatro objetivos visuales: frontal, izquierda, derecha y regreso frontal.
- Veinte muestras válidas por fase, a un intervalo local de 250 ms durante la calibración.
- Avance automático cuando se completa una fase.
- No se persisten imágenes, video, landmarks, identificadores de cámara ni muestras individuales.
- El servidor recibe solo versión, conteos por fase, perfil EDGE, duración y métricas agregadas de estabilidad.
- Cuando `RESEARCH_SESSION_CALIBRATION_REQUIRED=True`, los eventos y el acceso registrado al contenido fallan de forma cerrada hasta aceptar la calibración.
- Retirarse detiene la cámara y vuelve al panel del estudiante; no convierte la negativa en una etiqueta científica.

## Funciones separadas

| Rol | Acceso | Identidad visible |
| --- | --- | --- |
| Profesor | Programa la ventana y registra su anotación | Lista académica de su propio curso |
| Observador | Solo `/observer` y sus asignaciones | Código seudónimo y código físico de puesto |
| Investigador | Panel agregado autorizado | No participa en la anotación ni recibe nombres |

El observador no recibe video remoto. Profesor y observador están en el aula, miran presencialmente el mismo código de puesto y reciben del servidor la misma ventana de cinco segundos. El desfase del reloj del navegador se corrige con `server_now`. Las respuestas permanecen ocultas hasta que cada persona envía su propia anotación.

## Datos interpretables

Se conservan por separado la anotación del profesor, la anotación independiente, el estado `no_observable`, el autoinforme, el resultado académico y la salida del modelo. Las etiquetas describen orientación visible compatible o no compatible con la tarea; no miden directamente un estado mental.

El análisis previsto incluye acuerdo de Cohen con intervalo por participante, cobertura y causas de no observabilidad, además de sensibilidad, especificidad, AUROC, AUPRC, Brier y calibración del modelo cuando corresponda. Las particiones de entrenamiento y confirmación deben realizarse por participante antes de construir ventanas.

## Activación

Después de registrar la aprobación documental:

```text
Backend:
OBSERVER_ANNOTATION=True
RESEARCH_SESSION_CALIBRATION_REQUIRED=True
OCULAR_CALIBRATION_MIN_SAMPLES=20

Frontend:
NEXT_PUBLIC_PILOT_RELEASE=true
NEXT_PUBLIC_OBSERVER_ANNOTATION=true
NEXT_PUBLIC_RESEARCH_SESSION_CALIBRATION_REQUIRED=true
```

Backend y frontend deben desplegarse juntos. Antes del piloto se debe crear una cuenta con rol `observer`, asignar códigos físicos de puesto sin nombres y ejecutar una prueba con participantes sintéticos.

## Rollback

1. Desactivar `NEXT_PUBLIC_RESEARCH_SESSION_CALIBRATION_REQUIRED` y desplegar el frontend.
2. Desactivar `RESEARCH_SESSION_CALIBRATION_REQUIRED` y `OBSERVER_ANNOTATION` en el backend.
3. Conservar la migración: es aditiva y no obliga a eliminar registros.
4. No reutilizar cuentas `observer` como investigadores ni profesores.
