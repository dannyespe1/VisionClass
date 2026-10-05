# Preflight técnico del piloto

Fecha: 2026-10-05

Responsable operativo: desarrollador del repositorio

Estado: `AUTOMATED_PASS_MANUAL_PENDING`

## Alcance

Este preflight verifica el candidato aprobado para calibración local obligatoria y doble observación. Usa un proyecto Compose, base de datos, Redis, imágenes y puertos aislados. No reutiliza datos, volúmenes, credenciales ni artefactos del despliegue activo.

## Configuración validada

- Los valores predeterminados de `PILOT_RELEASE`, `OBSERVER_ANNOTATION` y `RESEARCH_SESSION_CALIBRATION_REQUIRED` permanecen apagados.
- Las mismas variables pueden activarse explícitamente desde el entorno sin editar `docker-compose.yml`.
- El frontend conserva las dependencias instaladas en la imagen aunque el código se monte como volumen.
- El backend monta `contracts/` en modo de solo lectura para ejecutar los contratos y fixtures compartidos.

## Evidencia automática

- PostgreSQL y Redis: saludables.
- Backend `/api/health/live/`: `ok`.
- Backend `/api/health/ready/`: base de datos y Redis `ok`.
- ML `/health`: `ok`.
- Frontend `/login`, `/student` y `/observer`: HTTP 200.
- Inicio de sesión local: backend aceptó correo y usuario de la cuenta sintética; el formulario dejó de mostrar `Failed to fetch` tras cargar `frontend/.env.local` y reiniciar solo el frontend.
- Endpoints de calibración y observación sin credenciales: HTTP 401.
- Migraciones hasta `0029_researchcalibration_observer_role`: aplicadas.
- `manage.py check`: sin errores.
- Deriva de migraciones: ninguna.
- Pruebas específicas con funciones del piloto activadas: 18/18.
- Suite general con los valores seguros de línea base: 167/167.

## Verificación manual pendiente

Antes de incorporar participantes se debe completar desde un navegador compatible:

1. Ingreso de un estudiante de prueba y consentimiento vigente.
2. Permiso de cámara y confirmación de que no salen imágenes o video por la red.
3. Cuatro objetivos de calibración y bloqueo efectivo del curso antes de completarlos.
4. Inicio del curso después de que el backend acepte la calibración agregada.
5. Programación de una misma ventana para profesor y observador independiente.
6. Coincidencia de código seudónimo, puesto físico y temporizador en ambos paneles.
7. Registro de dos anotaciones independientes sin revelar la respuesta contraria.
8. Detención de cámara, workers y temporizadores al salir o revocar consentimiento.

## Rollback

1. Definir en `false` las tres banderas de activación del backend y frontend.
2. Redesplegar ambos servicios juntos.
3. Confirmar que la API de calibración ya no bloquea el flujo ordinario y que `/observer` no recibe asignaciones.
4. Conservar la migración aditiva y los registros autorizados según la política de retención.
