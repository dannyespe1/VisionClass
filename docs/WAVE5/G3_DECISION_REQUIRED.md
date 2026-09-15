# Decisiones requeridas antes de G3

G3 no está aprobado por la integración técnica. Antes de PR19 se requiere evidencia humana e institucional independiente.

## Autorización del flujo de características

Debe aprobarse explícitamente si VisionClass puede enviar y persistir desde el navegador el siguiente sobre derivado:

- destino: backend autenticado de VisionClass;
- finalidad: persistir observaciones normalizadas para ventanas temporales y evaluación posterior, nunca vigilancia o decisiones operativas;
- contenido: geometría normalizada, presencia, luminancia resumida, confianza, razón de no observabilidad, timestamps, versión de extractor/preprocesamiento y perfil Edge;
- exclusiones: imágenes, video, audio, blobs, correo, nombre, `user_id` declarado por el cliente y etiquetas de estado interno;
- controles: consentimiento vigente para procesamiento local y persistencia derivada, sesión autenticada, idempotencia, retención/borrado de PR14 y feature flags apagados por defecto.

La autorización debe indicar también periodo de retención, acceso por rol y si se permite conservar eventos `no_observable` para auditoría de calidad.

## Pendientes científicos e institucionales

- Ratificación independiente de P0.3 D01, D03, D05 y D08.
- Cierre del umbral y efecto mínimo M1 antes de abrir un holdout.
- Aprobaciones de privacidad/ética y protocolo aplicable.
- Matriz manual de navegadores/dispositivos con permisos denegados, cámaras múltiples, suspensión de pestaña, batería limitada y liberación de recursos.
- Confirmación de que los umbrales iniciales de PR17 se calibrarán en shadow mode y no se interpretarán como atención interna.

Hasta resolverlo: cero participantes autorizados, cero datos reales, cero entrenamiento/evaluación, flags apagados y PR19 bloqueado.
