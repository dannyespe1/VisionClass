# Matriz de compatibilidad Edge para G3

**Fecha de diseño:** 2026-09-15  
**Estado:** preparada; correcciones B01–B08 implementadas en `pr18b-g3-compat`; smoke test local aprobado; ejecución manual multiplataforma pendiente  
**Alcance:** cámara consentida, extracción local, calidad, `no_observable`, perfiles Edge y persistencia derivada autorizada. No usa participantes ni datos reales.

## 1. Plataformas mínimas

En cada ejecución debe registrarse versión exacta de SO, navegador, dispositivo y cámara. “Última estable” no sustituye el número de versión en la evidencia final.

| ID | Sistema/dispositivo | Navegador | Razón |
| --- | --- | --- | --- |
| P01 | Windows 11, portátil x64, cámara integrada | Chrome estable | BYOD Chromium principal |
| P02 | Windows 11, portátil x64, cámara integrada | Edge estable | navegador institucional probable |
| P03 | Windows 11, portátil x64, cámara integrada | Firefox estable | motor no Chromium |
| P04 | macOS soportado, MacBook con cámara integrada | Safari estable | WebKit escritorio |
| P05 | Android soportado, gama media, cámara frontal/trasera | Chrome estable | móvil Chromium y batería real |
| P06 | iOS soportado, iPhone/iPad, cámara frontal/trasera | Safari estable | WebKit móvil |
| P07 | Ubuntu LTS, portátil x64, cámara integrada | Chrome estable | BYOD Linux |

La aprobación requiere resultados por plataforma, no una inferencia basada en que dos navegadores compartan Chromium.

## 2. Casos obligatorios

| Caso | Escenario | Acción | Criterio de aprobación |
| --- | --- | --- | --- |
| C01 | Contexto seguro | Abrir en HTTPS y luego intentar origen HTTP no local | HTTPS puede solicitar cámara; HTTP falla cerrado sin excepción no controlada ni captura |
| C02 | Cámara deshabilitada | Rechazar cámara desde el diálogo de VisionClass | No se llama `getUserMedia`; curso continúa con alternativa funcional |
| C03 | Permiso denegado | Habilitar en la app y denegar en navegador | Sin stream ni reintento automático; mensaje comprensible; cero observaciones persistidas |
| C04 | Consentimiento revocado/expirado | Revocar mientras la cámara está activa | Captura, timers, cola, extractor y tracks se detienen; backend rechaza eventos posteriores |
| C05 | Cámaras múltiples | Conectar dos cámaras o usar frontal/trasera; seleccionar y cambiar | El usuario conoce y controla la cámara activa; el cambio reinicia ventana y no mezcla perfiles |
| C06 | Pestaña oculta y retorno | Ocultar 30 s y volver | Se detiene al ocultar; al volver queda detenido o se reinicia solo mediante flujo visible y consentido; sin intervalo silencioso |
| C07 | Suspensión/bloqueo | Bloquear pantalla o suspender y reanudar | No hay captura en segundo plano; gaps quedan explícitos; no se fabrica continuidad |
| C08 | Cámara desconectada | Desconectar USB o terminar track desde SO | Estado degradado/no observable; recursos liberados; sin bucle de errores ni valores cero falsos |
| C09 | Batería limitada | Ejecutar bajo 20 %, ahorro de batería y sin Battery API | Perfil `low` o fallback seguro; nunca se aumenta carga por ausencia de telemetría |
| C10 | Detector no disponible | Deshabilitar `FaceDetector` o usar navegador sin soporte | `detector_unavailable`/`no_observable`; curso sigue; nunca distracción ni atención cero |
| C11 | Calidad insuficiente | Baja luz, oclusión, sin rostro y video no listo | Razón exacta de `no_observable`; no se genera estado observable ni intervención |
| C12 | Cambio de perfil | Forzar low/balanced/high y oscilaciones rápidas | Generación incrementa, ventana se reinicia, histéresis evita oscilación y payload identifica perfil |
| C13 | Backend/red no disponible | Cortar red durante persistencia derivada | Extracción local no transmite crudos; UI se degrada; reintento no duplica y no pierde control de consentimiento |
| C14 | Salida y navegación | Cambiar de curso, cerrar diálogo, navegar y cerrar pestaña | Tracks terminados, luz de cámara apagada, timers/cola/canvas liberados |
| C15 | Sesión prolongada | 30 min con cambios de visibilidad y calidad | Memoria estable, cola acotada, sin aumento de tracks/timers y contadores coherentes |

Los casos C01–C04, C06–C08 y C10–C15 se ejecutan en P01–P07. C05 se ejecuta al menos en Windows con dos cámaras y en Android/iOS con frontal/trasera. C09 se ejecuta en un portátil y un móvil con medición real.

## 3. Evidencia mínima por ejecución

- Identificador no personal de ejecución.
- Fecha, SO y versión, navegador y versión, clase de dispositivo y cámara.
- Commit y valores de flags.
- Caso, resultado `PASS`/`FAIL`/`BLOCKED`, observación y ticket si falla.
- Captura únicamente de UI o DevTools sin rostro, nombre, correo, tokens, payloads personales ni material de cámara.
- Para C03, C04, C10–C13: conteo de observaciones y prueba de que no salió material crudo.
- Para C14/C15: número de tracks vivos, timers/cola y memoria antes/después.
- Firma o iniciales del revisor independiente; no se requiere entregar el documento privado de identidad.

El registro para completar está en `EJECUCION_MATRIZ_EDGE_G3.csv`.

## 4. Revisión estática contra el código actual

| Hallazgo | Evidencia | Impacto | Estado antes de ejecución |
| --- | --- | --- | --- |
| B01 — dependencia experimental | `browser-feature-extractor.mjs` usa `globalThis.FaceDetector`; Chrome documenta Face Detection todavía detrás de flag y recomienda fallback | P03–P07 probablemente producirán `detector_unavailable`; no existe extractor alternativo | bloqueante de cobertura visual, no de acceso al curso |
| B02 — retorno desde pestaña oculta | `page.tsx:654-677` detiene cámara al ocultar, pero no maneja transición a visible | La captura no se reanuda ni explica claramente el estado | bloqueante C06 |
| B03 — múltiples cámaras | Existen constraints por `deviceId`, pero la página no enumera ni ofrece selector | No se puede demostrar control de cámara activa | bloqueante C05 |
| B04 — batería no conectada | `profileForEnvironment` acepta `batteryLevel`, pero `page.tsx:600-605` no lo proporciona | C09 no puede demostrar adaptación real; ausencia de Battery API debe caer a `low` | bloqueante C09 |
| B05 — familia de navegador incompleta | `page.tsx:563` clasifica solo Firefox o Chromium | Safari quedaría etiquetado como Chromium | bloqueante de procedencia P04/P06 |
| B06 — error tras adquirir stream | Si falla `canplay` o `play`, el `catch` no llama `stopCamera` | Un track podría permanecer vivo después de error | bloqueante de privacidad C08/C14 |
| B07 — estado de transporte sobrescrito | Tras iniciar el POST, `page.tsx:574` fija `idle` inmediatamente | Puede ocultar estado `sending` o `degraded` | corrección necesaria antes de C13 |
| B08 — estado ético obsoleto en UI | El modal mostraba “pendiente de aprobación” de forma fija aunque el backend tuviera un texto aprobado | Información contradictoria y posibilidad de iniciar un flujo antes de conocer el estado vigente | bloqueante de consistencia y fallo cerrado |

## 5. Corrección técnica preparada

| Hallazgo | Corrección | Verificación automatizada |
| --- | --- | --- |
| B01 | fallback MediaPipe Tasks Vision 1.0.1, WASM y modelo locales con hash fijado; sin URL remota en runtime | build de producción + pruebas de rutas same-origin y ausencia de upload de imágenes |
| B02 | reanudación consentida al volver a visible | prueba estática del manejador y pruebas manuales C06/C07 pendientes |
| B03 | enumeración y selector explícito de cámaras | typecheck/build; C05 manual pendiente |
| B04 | lectura opcional de Battery API y perfil `low` cuando no existe | pruebas unitarias de batería baja/ausente |
| B05 | procedencia separada Firefox, Edge, Chromium, Safari y unknown | typecheck/build; comprobación manual por plataforma pendiente |
| B06 | liberación ante timeout/play/error y evento `ended` del track | pruebas de ciclo de vida existentes; C08/C14 manual pendientes |
| B07 | `sending`/`degraded` ya no se sobrescriben inmediatamente | revisión estática y build; C13 manual pendiente |
| B08 | el modal consulta el estado de consentimiento del backend, muestra su versión y mantiene deshabilitada la activación si el texto no está habilitado y aprobado | typecheck, lint focalizado del componente, build y smoke test local aprobados |

Resultado automatizado de la rama: TypeScript sin errores, 30 pruebas aprobadas y build Next.js aprobado. Esto habilita ejecutar la matriz, pero no la sustituye ni aprueba G3.

## 6. Smoke test local ejecutado

El 2026-09-15 se ejecutó un smoke test adicional en un entorno Docker aislado, con cuenta, curso y base de datos exclusivamente sintéticos. El navegador disponible fue el navegador integrado de Codex, por lo que esta ejecución **no equivale a P01 ni sustituye ninguna plataforma obligatoria**.

- commit técnico: `52c4a3b`;
- consentimiento servido por backend: habilitado, texto aprobado y versión visible `G3-MATRIX-LOCAL-2026-09-15`;
- alternativa sin cámara: el curso continuó y el modal se cerró normalmente;
- observaciones persistidas después del flujo: `0`;
- eventos de consentimiento sintéticos: `7`;
- almacenamiento/transmisión de imagen: no autorizados y no observados en este flujo;
- limitación: la versión exacta del navegador integrado no fue expuesta y el permiso físico de cámara no pudo completarse de forma automatizada.

El resultado acredita únicamente el camino C02 y el control negativo de persistencia en el entorno de smoke. G3 continúa pendiente hasta completar P01–P07, C05, C09 y la revisión independiente final.

## 7. Fuentes de compatibilidad

- `getUserMedia` es ampliamente soportado, pero requiere HTTPS y permiso: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Page Visibility es ampliamente soportado y los navegadores limitan timers en segundo plano: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- `enumerateDevices` es ampliamente soportado y depende de permiso/contexto seguro: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
- Battery Status tiene disponibilidad limitada y exige fallback: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery
- Chrome mantiene `FaceDetector` como capacidad no garantizada y recomienda detección defensiva/fallback: https://developer.chrome.com/docs/capabilities/shape-detection
