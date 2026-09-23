# Extracción ocular Edge v2

## Estado

`normalized-ocular-features-v2` es un contrato candidato para validación local. No reemplaza el contrato `normalized-features-v1`, no modifica los pesos ni el umbral canónico y no activa intervenciones. El umbral `0.70` se presenta únicamente como comparación exploratoria en shadow.

## Señal local

Face Landmarker se carga desde el mismo origen con el artefacto oficial `face_landmarker.task` fijado por SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`. Se configura para un rostro y sin blendshapes ni matrices de transformación.

El extractor calcula y descarta localmente los landmarks. Conserva en memoria 15 valores normalizados: geometría facial, orientación de cabeza, posición relativa de ambos iris, orientación binocular y apertura ocular. No serializa ni transmite imágenes, video, bitmaps o landmarks.

Una medición ocular incompleta, ojos cerrados o discordancia excesiva produce `no_observable`; nunca se convierte automáticamente en una clase negativa.

## Decisión entre hilo principal y Web Worker

Cuando `NEXT_PUBLIC_OCULAR_WORKER_BENCHMARK=true` y el navegador soporta `Worker` y `createImageBitmap`, el dispositivo descarta tres muestras de calentamiento y luego alterna seis muestras válidas por carril. Registra exclusivamente en memoria:

- latencia total p50 y p95;
- retraso p95 del bucle de eventos como aproximación al bloqueo del hilo principal;
- cobertura observable.

El worker se selecciona solamente cuando conserva la cobertura dentro de 5 puntos porcentuales, reduce el retraso del hilo principal al menos 25% —o hasta un máximo de 8 ms— y su latencia total p95 no supera 1.5 veces la principal ni añade más de 25 ms. En caso de duda se conserva el hilo principal.

La selección y la evidencia comparativa quedan congeladas al completar el benchmark y se reinician al comenzar una nueva ejecución de cámara. Al detenerla, el último resumen p95 permanece visible en memoria para poder revisarlo; se pierde al recargar o abandonar la página. Ninguna métrica de alta granularidad se transmite.

## Protocolo local por fases

El panel de configuración permite marcar `frontal`, `ojos izquierda`, `ojos derecha` y `regreso frontal`. Para cada fase conserva únicamente histogramas agregados, conteo, media, media recortada al 10%, mínimo y máximo de orientación binocular, apertura ocular y concordancia entre iris. No conserva muestras individuales ni landmarks y el resumen completo desaparece al recargar la página.

La calibración experimental requiere 40 muestras válidas por fase y congela cada fase al alcanzar ese límite para evitar contaminación durante la transición. El centro se calcula con frontal y regreso frontal; los límites direccionales se ubican al 60% del desplazamiento observado hacia cada lado. Solo se declara `ready` si el centro queda entre ambas direcciones, la separación es al menos 0,10 y la deriva entre centros no supera 0,08. Estos límites son locales, efímeros y no modifican el umbral canónico.

## Activación y rollback

```text
NEXT_PUBLIC_BROWSER_EXTRACTOR=true
NEXT_PUBLIC_OCULAR_FEATURES_V2=true
NEXT_PUBLIC_OCULAR_WORKER_BENCHMARK=true
```

Para mantener iris en el hilo principal, usar `NEXT_PUBLIC_OCULAR_WORKER_BENCHMARK=false`. Para volver completamente al extractor facial v1, usar `NEXT_PUBLIC_OCULAR_FEATURES_V2=false` y reconstruir o reiniciar el frontend según el entorno.

## Límites científicos

La salida es un proxy de orientación ocular basado en el iris, no diámetro pupilar, atención interna ni punto de mirada calibrado sobre la pantalla. La promoción de un modelo ocular requiere datos aprobados, partición por participante, sensibilidad mínima `0.70`, especificidad mínima `0.80`, calibración, cobertura y revisión de equidad.
