# Reutilización acotada de calibración ocular

## Decisión

La calibración no se repite al entrar en cada curso. Después de completar una calibración aceptada en el despliegue de Render, el mismo estudiante puede reutilizarla durante un máximo de 12 horas cuando mantiene el mismo navegador, origen y cámara.

La primera calibración debe realizarse en Render. Una calibración hecha en `localhost` no se traslada porque el almacenamiento del navegador y la base de datos pertenecen a entornos distintos.

## Datos conservados

- El backend conserva el resumen agregado ya aprobado: conteos por fase, separación direccional, deriva central, perfil, duración y versión.
- El backend conserva únicamente SHA-256 del token opaco de reutilización; nunca el token en texto claro.
- El navegador conserva el token opaco, identificador interno del participante, identificador local de cámara, versión y vencimiento.
- No se conservan ni transmiten imágenes, video, audio, frames, landmarks ni muestras individuales.

## Flujo

1. El estudiante concede los permisos y completa las cuatro posiciones.
2. El backend valida el consentimiento, los mínimos y la calidad; registra el resumen y entrega un token aleatorio de uso acotado.
3. Al abrir otro curso, el frontend comprueba localmente el mismo participante, cámara, versión y vigencia.
4. El backend vuelve a verificar identidad, propiedad de la sesión, matrícula activa, consentimiento, versión, token y vencimiento.
5. Solo entonces copia el resumen autorizado a la sesión nueva y abre el contenido.

Ante token ausente, alterado, vencido, otro usuario, otra cámara, otra versión, consentimiento revocado o error del servidor, el sistema falla de forma cerrada y solicita una calibración nueva.

Una calibración nueva invalida en el servidor las pruebas de reutilización anteriores del participante.

## Activación y rollback

- Activación backend: `OCULAR_CALIBRATION_REUSE_ENABLED=True`.
- Vigencia: `OCULAR_CALIBRATION_REUSE_HOURS=12`, limitada en código a 1–24 horas.
- Rollback: definir `OCULAR_CALIBRATION_REUSE_ENABLED=False` y redesplegar el backend. Las sesiones nuevas volverán a requerir calibración; los tokens locales no podrán abrir contenido.
- La migración `0030_researchcalibration_reuse` es aditiva y puede permanecer instalada durante el rollback.
