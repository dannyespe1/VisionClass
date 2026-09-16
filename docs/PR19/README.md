# PR19 — Baselines reproducibles

PR19 implementa dos referencias para clasificación de **orientación observable hacia la tarea**: una regla estática y un clasificador logístico por ventana. Ninguna salida representa atención interna, diagnóstico o autorización de intervención.

## Contrato y privacidad

- Entrada: ventanas `normalized-features-v1`, etiqueta binaria independiente y un identificador de análisis seudónimo.
- `no_observable`: se excluye de la clasificación binaria y permanece en el denominador de cobertura.
- Split: se asigna por participante antes de generar ventanas; una prueba negativa bloquea cualquier fuga entre train, validation y test.
- Umbral: se elige únicamente en validation como el menor que cumpla sensibilidad `>= 0.70` y especificidad `>= 0.80`; test nunca participa en la selección.
- Datos: este PR no incluye ni ejecuta datos reales. El runner rechaza entradas que no declaren `synthetic` o `approved_pseudonymized`.

## Reproducción

```powershell
python -m unittest ml.test_baselines -v
python -m compileall -q ml
```

El runner recibe JSON con `data_classification` y `windows`, una configuración versionada y una ruta de salida:

```powershell
python ml/run_baselines.py --input <dataset-aprobado.json> --config ml/config/pr19_baselines_v1.json --output <artefacto.json> --code-version <commit-o-tag>
```

El artefacto registra hashes de entrada/configuración, versión de código, versiones de Python/NumPy, splits, coeficientes, semilla, métricas, matriz de confusión e intervalos bootstrap por participante. Los identificadores de análisis reales y los resultados derivados no deben incorporarse al repositorio.

## Rollback

PR19 no activa inferencia ni despliega modelos. El rollback consiste en retirar `ml/baselines.py`, su runner/configuración y sus pruebas; ningún esquema, contrato API o dato persistido cambia.
