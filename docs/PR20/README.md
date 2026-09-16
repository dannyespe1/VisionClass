# PR20 — Modelo de estados de evidencia observable

PR20 implementa un HMM reproducible de dos estados: `off_task_evidence` y `task_oriented_evidence`. Los nombres describen evidencia observable; no atribuyen atención interna, intención, diagnóstico ni permiten intervención.

## Comportamiento

- Entrenamiento supervisado de probabilidades iniciales, transiciones y emisiones gaussianas con suavizado versionado.
- Filtrado online con posterior completo y entropía normalizada como incertidumbre.
- Suavizado forward-backward para análisis offline.
- `no_observable` corta el segmento sin emisión, clase negativa, cero ni imputación.
- Un gap superior a 7.5 segundos reinicia el segmento.
- Eventos repetidos o fuera de orden se rechazan.
- Toda salida fija `allow_intervention=false`.

## Verificación

```powershell
python -m unittest ml.test_state_model -v
python -m unittest discover -s ml -p test_*.py -v
python -m compileall -q ml
```

El artefacto sintético demuestra reproducibilidad y restricciones del pipeline. Sus valores no son evidencia de validez o desempeño con participantes.

## Rollback

El modelo no está conectado al servicio online ni a un alias activo. El rollback consiste en retirar `ml/state_model.py`, su configuración, pruebas y artefactos PR20; no cambia esquemas, endpoints ni datos persistidos.
