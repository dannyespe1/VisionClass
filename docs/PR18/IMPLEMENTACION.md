# PR18 — Perfiles de ejecución Edge

## Perfiles

| Perfil | Resolución máxima | FPS máximo | Muestreo | Características |
| --- | ---: | ---: | ---: | --- |
| bajo (`low`) | 320×240 | 5 | 1.000 ms | rostro y calidad |
| balanceado | 640×480 | 10 | 500 ms | rostro, calidad y pose |
| alto | 1280×720 | 15 | 250 ms | rostro, calidad, pose y mirada |

`low` es el respaldo para equipos no caracterizados, batería menor a 20 %, pestaña oculta o hasta dos hilos lógicos. La inferencia declarada permanece en Edge; ningún perfil habilita subida de imágenes.

## Continuidad y control

Cada cambio incrementa `profile_generation` y exige reiniciar la ventana para no mezclar muestras incompatibles. Un enfriamiento de 10 segundos evita oscilaciones. La selección remota se rechaza salvo consentimiento explícito y nunca puede superar la capacidad máxima asignada al dispositivo.

Los eventos incluyen `device.execution_profile`. La telemetría de cambios contiene solo perfil anterior/nuevo, motivo, fuente, tiempo y generación; no contiene usuario, sesión ni características.

## Activación

`NEXT_PUBLIC_EDGE_PROFILES=false` por defecto. No hay ajuste automático basado en rendimiento de modelos; esa capacidad queda fuera hasta PR27 y sus gates. Antes de activar se requieren pruebas manuales por navegador/dispositivo y revisión de consumo energético.

## Rollback

Apagar el flag fija el perfil seguro `low`, limpia la ventana activa y desactiva cambios remotos. Los eventos previos conservan su perfil y generación para análisis reproducible.
