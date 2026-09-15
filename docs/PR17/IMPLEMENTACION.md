# PR17 — Puerta de calidad y estado no observable

## Resultado

`quality-gate-v1` separa ausencia de datos, ausencia de rostro, iluminación insuficiente, rostro parcial, oclusión, baja confianza, pérdida de frames y continuidad insuficiente. Cada bloqueo genera un código estable y una explicación no culpabilizante.

Una ventana necesita al menos tres muestras, continuidad máxima de 2,5 segundos y 60 % de muestras observables. Si no cumple, `allow_inference=false`; `allow_intervention` permanece siempre en `false` en esta fase. El flag `NEXT_PUBLIC_QUALITY_GATE_V1` está apagado por defecto.

## Umbrales iniciales

- luminancia mínima: 0,15;
- margen mínimo del rostro: 0,02 del lado menor;
- confianza mínima: 0,50;
- separación máxima entre muestras: 2.500 ms.

Son umbrales iniciales conservadores, no una validación científica. Su calibración requiere shadow mode, fixtures consentidos y aprobación G3; no se ajustaron con participantes ni datos reales.

## Auditoría y privacidad

La razón, proporción observable, número de muestras y confianza forman una salida estructurada incorporable al evento normalizado. La luminancia se resume localmente y no conserva píxeles. El sistema no fuerza una clasificación cuando la señal falla.

## Verificación y rollback

Pruebas sintéticas TypeScript/Python cubren oscuridad, salida de cuadro, oclusión, ausencia, pérdida de frames y ventana continua. El rollback fija el último conjunto validado o apaga el flag; no habilita inferencia sobre ventanas insuficientes.
