# PR27 — Scheduler adaptativo local

## Resultado

Se implementó `adaptive_scheduler` como una política local, determinista y desactivada por defecto. Selecciona perfil Edge y frecuencia de muestreo a partir de las categorías amplias de PR26, cobertura de señal e incertidumbre de calidad de observación. La ubicación de inferencia solo puede ser `local_device`, `local_fallback` o `disabled`; no existe una salida remota.

## Política y prioridades

1. Consentimiento y privacidad son restricciones inviolables. Si alguna falla, se deshabilita la ejecución.
2. Calidad/cobertura insuficiente o incertidumbre alta fuerzan fallback local.
3. Energía baja/ahorro, latencia desde 100 ms y CPU ocupada generan presión de degradación.
4. El presupuesto objetivo es latencia menor de 100 ms; la recuperación exige cobertura mínima de 0.85, incertidumbre máxima de 0.45, energía normal/cargando y CPU normal.
5. Una degradación requiere dos ventanas consecutivas; una recuperación requiere tres. El tiempo mínimo por perfil es 30 segundos.
6. Cada transición avanza solo un nivel: `high → balanced → low` o su recuperación inversa.

Cada decisión conserva en memoria un registro acotado a 100 elementos con únicamente categorías de recursos, cobertura e incertidumbre redondeadas, motivo, perfil y ubicación local. No se incluyen participantes, dispositivo, `user-agent`, IP, demografía ni medios crudos; el registro no se transmite ni persiste.

## Integración

Cuando `NEXT_PUBLIC_ADAPTIVE_SCHEDULER=true`, el curso reutiliza el recolector local de PR26 aunque el participante haya optado por no persistir telemetría. La decisión puede cambiar frecuencia, restricciones de video y generación de perfil. La telemetría solo se envía al backend cuando su flag independiente está activo y el participante autorizó guardar análisis.

## Pruebas sintéticas

- Degradación progresiva por sobrecarga y cumplimiento de permanencia mínima.
- Ausencia de oscilación ante ruido breve y recuperación sostenida.
- Mala señal e incertidumbre alta hacia fallback local.
- Pérdida de red conservando ejecución exclusivamente local.
- Consentimiento, privacidad y métricas inválidas con cierre seguro.
- Bitácora acotada y sin campos de fingerprinting.

No se usaron participantes, datos reales, entrenamiento, evaluación clínica ni despliegue.

## Rollback

Mantener `NEXT_PUBLIC_ADAPTIVE_SCHEDULER=false`. El flujo anterior de PR18 conserva la selección local de perfil y su fallback seguro. Si una operación requiere un perfil fijo validado, se configura `balanced` solo después de comprobar compatibilidad del dispositivo; el apagado no habilita inferencia remota ni omite consentimiento o calidad.

## Riesgos residuales

- Los umbrales son de ingeniería y deben caracterizarse por dispositivo en PR28 antes de una habilitación general.
- El navegador puede no exponer memoria, batería o red; esos valores quedan `unknown` y no habilitan recuperación.
- Aplicar nuevas restricciones de cámara puede fallar según el navegador; el flujo detiene la captura en vez de continuar con un estado divergente.
- La suite global mantiene dos fallos preexistentes de PR25 por longitud/hash del artefacto en este checkout. No cambian con PR27.
