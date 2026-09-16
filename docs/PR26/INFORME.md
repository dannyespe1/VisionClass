# PR26 — Telemetría minimizada de recursos del dispositivo

## Resultado

Se implementó el control `device_budget_telemetry` para comparar perfiles Edge sin crear un identificador persistente del dispositivo. El control queda apagado por defecto tanto en navegador como en backend.

La captura agrupa FPS, latencia, memoria disponible informada por el navegador, red, carga aproximada y estado energético permitido. El backend solo admite categorías cerradas y asocia cada muestra a la sesión autenticada y al perfil de ejecución. No admite identificador de dispositivo, `user-agent`, IP, resolución, correo, datos demográficos ni un ID de usuario declarado por el cliente.

## Controles

- `NEXT_PUBLIC_DEVICE_BUDGET_TELEMETRY=false` y `DEVICE_BUDGET_TELEMETRY=False` conservan el cierre seguro.
- El navegador solo muestrea cuando el participante habilitó guardar análisis; el backend exige además consentimiento vigente para procesamiento local y persistencia derivada.
- El backend valida propiedad y vigencia de la sesión con la identidad autenticada.
- Se transmite un agregado cada 30 segundos como máximo, con hasta 120 observaciones por muestra.
- Valores imposibles se descartan en el cliente y se cuentan; categorías o contadores fuera de contrato se rechazan en el servidor.
- La retención predeterminada es 24 horas mediante `expires_at`; PR14 elimina muestras vencidas y las incluye en la supresión por participante.
- No existe endpoint de listado ni exportación individual para esta telemetría.

## Simulaciones

Las pruebas sintéticas cubren CPU saturada, red limitada, ahorro de batería, valores imposibles, ausencia de campos de fingerprinting, consentimiento inválido, sesión ajena, frecuencia excesiva y caducidad corta. No se usaron participantes ni datos reales.

## Rollback

Desactivar ambos flags detiene emisión e ingesta. Las muestras existentes vencen a las 24 horas y pueden purgarse con el trabajo de retención de PR14. Si el riesgo residual de fingerprinting no fuera aceptado, conservar únicamente agregados operativos sin sesión en una evolución posterior; este PR no habilita ese uso.

## Riesgos residuales

- La combinación de categorías amplias sigue siendo seudónima al estar vinculada a una sesión; por eso se limita la frecuencia, no hay identificador persistente y el TTL es corto.
- La Battery Status API y Network Information API no están disponibles en todos los navegadores; en ausencia de permiso o soporte se registra `unknown`.
- La suite global conserva fallos preexistentes de PR22 en PostgreSQL y dos fallos preexistentes de integridad de artefacto PR25 por longitud/hash en este checkout. Las pruebas focalizadas de PR26, typecheck y build pasan.
