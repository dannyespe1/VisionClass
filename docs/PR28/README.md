# PR28 — Benchmark reproducible y frontera de Pareto

PR28 incorpora un ejecutor versionado para comparar perfiles de inferencia por clase de dispositivo, carga y ubicación de ejecución. La entrega incluida usa exclusivamente datos sintéticos deterministas para verificar el contrato, la agregación, la incertidumbre, las unidades y el cálculo de Pareto. No constituye una medición de dispositivos ni evidencia de aula.

## Matriz controlada

La configuración `ml/config/pr28_benchmark_v1.json` congela 5 repeticiones de 120 segundos por escenario, con 30 segundos de calentamiento y enfriamiento, temperatura objetivo de 22 ± 2 °C y presupuesto de latencia p95 de 100 ms.

La matriz contiene 54 escenarios y 270 corridas:

| Eje | Valores |
| --- | --- |
| Clase de dispositivo | `constrained`, `standard`, `capable` |
| Perfil | `low`, `balanced`, `high` |
| Carga | `idle`, `nominal`, `busy` |
| Ubicación | `local_device`, `local_fallback` |

Los identificadores son clases amplias; no se almacenan identificadores persistentes de equipos, participantes ni sesiones de cámara. `raw_media_transmitted` debe ser siempre `false`.

## Métricas y unidades

- Desempeño predictivo: exactitud balanceada, ECE, Brier y cobertura, como proporciones.
- Ejecución: latencia p50/p95 en ms, memoria pico en MiB y red en KiB.
- Energía: Wh aproximados; no es una medición certificada.
- Condiciones: temperatura en °C, carga CPU en porcentaje y duración en segundos.
- Incertidumbre: media, desviación estándar e intervalo normal aproximado de 95 % por escenario.

El fallback local es una condición segura sin inferencia predictiva: sus métricas predictivas deben ser nulas y su cobertura cero. El validador rechaza matrices incompletas, repeticiones duplicadas o faltantes, unidades inválidas, temperaturas fuera de control, procedencia mezclada y cualquier transmisión de medios.

## Pareto y recomendaciones

La frontera se calcula para carga `nominal` y dentro de cada clase de dispositivo, porque las clases no son intercambiables. Maximiza exactitud balanceada y cobertura; minimiza ECE, latencia p95, memoria, energía aproximada y red.

El fixture sintético detecta como dominado `constrained__high__nominal__local_device`. Las recomendaciones sintéticas resultantes son `low` para equipos limitados, `balanced` para equipos estándar y `high` para equipos capaces. Son hipótesis técnicas para planificar la medición real, no recomendaciones de despliegue.

## Ejecución reproducible

Fixture sintético:

```powershell
python -m ml.run_benchmark_pareto --synthetic --config ml/config/pr28_benchmark_v1.json --output-dir docs/PR28 --code-version pr28-synthetic-v1
```

Medición controlada aprobada:

```powershell
python -m ml.run_benchmark_pareto --input <corridas-controladas.json> --config ml/config/pr28_benchmark_v1.json --output-dir <salida-versionada> --code-version <commit>
```

La entrada aprobada usa un objeto raíz `{"runs": [...]}` y debe incluir la matriz completa con `data_classification: "controlled_device_benchmark"`. El ejecutor genera CSV de corridas, JSON de agregados/procedencia/recomendaciones y una gráfica SVG. El modo sintético genera archivos con prefijo `SYNTHETIC`; el modo controlado, con prefijo `CONTROLLED`.

## Interpretación, piloto y rollback

Los resultados describen desempeño técnico bajo las condiciones registradas. No establecen atención interna, cognición, diagnóstico, intención ni causalidad, y no autorizan transmisión de imágenes ni inferencia remota.

Antes de cambiar el perfil predeterminado deben repetirse escenarios en equipos objetivo, documentar temperatura y carga, y validar una muestra durante el piloto conforme al expediente aprobado. Si el piloto contradice el laboratorio, se mantienen las conclusiones como “controladas/no generalizables” y se revierte al perfil fijo `balanced` mediante `NEXT_PUBLIC_ADAPTIVE_SCHEDULER=false` y `NEXT_PUBLIC_EDGE_FIXED_PROFILE=balanced`.
