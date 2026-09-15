# PR15 — Extracción de características en el navegador

## Resultado

El recorrido normal del curso dejó de serializar y subir imágenes. Con `NEXT_PUBLIC_BROWSER_EXTRACTOR=true`, el navegador usa `FaceDetector` cuando está disponible y conserva únicamente geometría normalizada, presencia y proxies derivados. Con el flag en `false` —su valor predeterminado— el sistema queda en modo sin captura.

No existe fallback de subida de imágenes. Un detector ausente o un error produce una muestra `observable=false`; no deriva una clasificación.

## Recursos y ciclo de vida

- La cámara se solicita sin audio, con resolución ideal 640×480 y máximo 24 FPS.
- Al ocultar la pestaña, salir, revocar el permiso o pausar, se detienen tracks, temporizadores y cola.
- El extractor cierra el detector y libera el canvas interno.
- PR16 añadirá normalización contractual y transporte versionado. PR15 mantiene las características localmente para no crear un contrato transitorio incompatible.

## Compatibilidad

`FaceDetector` no está disponible de forma homogénea en todos los navegadores. En navegadores no validados se usa el estado seguro `detector_unavailable` y no se captura ni se suben frames. La incorporación futura de MediaPipe u ONNX debe implementar la misma interfaz, conservar la prohibición de píxeles en red y aportar fixtures consentidos aprobados.

## Verificación

- Pruebas Node: geometría, ausencia de blobs, detector ausente, selección de cámara y liberación de recursos.
- TypeScript: PASS.
- Build Next.js: PASS.
- Prueba estática: el flujo del curso no contiene `toBlob`, `postFrameToML` ni un campo `file`.

## Activación y rollback

El flag permanece apagado. Antes de activarlo se requieren pruebas manuales de permisos, cámaras múltiples, suspensión de pestaña y compatibilidad en cada navegador objetivo. El rollback es apagar el flag y operar sin captura; nunca reactivar la subida automática de imágenes.
