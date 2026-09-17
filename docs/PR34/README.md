# PR34 — Auditoría de equidad con protección estadística

PR34 incorpora un auditor reproducible de cobertura, error y calibración por grupos e intersecciones. La entrega usa exclusivamente datos sintéticos y códigos de grupo opacos; no accede a la bóveda demográfica, no contiene atributos reales y no establece que el sistema sea equitativo.

## Frontera de privacidad

El auditor recibe un dataset de investigación previamente autorizado y separado de identidad operativa. Solo admite:

- seudónimo opaco de participante;
- identificador opaco de ventana;
- códigos de grupo autorizados y acotados a dos dimensiones;
- etiqueta binaria, probabilidad y estado de observabilidad.

No acepta nombres, correos ni códigos con caracteres propios de identificadores directos. En modo real exige referencias separadas de suficiencia por grupo y liberación desde la bóveda.

Las celdas que no cumplen simultáneamente los mínimos de participantes, observaciones, positivos y negativos se suprimen. Además, se aplica supresión complementaria a todo el mismo alcance comparativo —dimensión o intersecciones— para impedir que una celda pequeña pueda reconstruirse restando celdas publicadas del total. El informe no publica su selector, denominador ni identificador. Tampoco copia el dataset protegido a la salida real.

## Métricas y unidad

La unidad inferencial y de bootstrap es el participante; las ventanas son medidas repetidas. Cada celda liberable incluye:

- participantes, registros, observables, positivos y negativos;
- falsos positivos y falsos negativos;
- macro-F1, Brier, ECE y tabla de calibración;
- cobertura y `no_observable`;
- intervalos percentiles de 95 % agrupados por participante.

Se comparan grupos simples e intersecciones. Una celda suprimida bloquea la conclusión de equidad: insuficiencia de evidencia nunca se interpreta como ausencia de sesgo.

## Umbrales congelados

La configuración `ml/config/pr34_fairness_audit_v1.json` usa los siguientes límites técnicos conservadores:

| Control | Valor |
| --- | ---: |
| Participantes totales | 80–100 |
| Participantes mínimos por celda | 20 |
| Registros observables mínimos | 100 |
| Positivos/negativos mínimos | 20/20 |
| Umbral común | 0,5 |
| Brecha máxima de error o calibración | 0,10 |
| Brecha máxima de cobertura | 0,10 |
| Cobertura mínima | 0,70 |

Estos límites implementan un gate técnico; no sustituyen potencia estadística, revisión ética, aprobación de privacidad ni decisión G5.

## Sensibilidad de umbrales

Se calculan resultados con umbrales comunes de 0,3 a 0,7 y un umbral exploratorio por celda que aproxima el equilibrio entre falsos positivos y negativos. `application_permitted` es siempre `false`: PR34 no cambia el modelo ni autoriza decisiones distintas por grupo.

## Gate de no despliegue

La promoción queda bloqueada si ocurre cualquiera de estas condiciones:

- una celda preespecificada es pequeña o carece de outcomes suficientes;
- una brecha de error, calibración o cobertura supera el límite;
- cualquier celda liberada queda por debajo de cobertura mínima;
- la evidencia es sintética;
- falta aprobación de suficiencia por grupo, liberación de bóveda o revisión independiente.

El fixture contiene deliberadamente una intersección pequeña y una degradación sintética; por ello el resultado correcto es `BLOCK_PROMOTION_SYNTHETIC_ONLY`.

## Ejecución

Fixture reproducible:

```powershell
python -m ml.run_fairness_audit --synthetic --config ml/config/pr34_fairness_audit_v1.json --output-dir docs/PR34 --code-version pr34-synthetic-v1
```

Auditoría real aprobada:

```powershell
python -m ml.run_fairness_audit --input <dataset-protegido.json> --config ml/config/pr34_fairness_audit_v1.json --output-dir <salida-restringida> --code-version <commit>
```

## Mitigación y rollback

Ante un incumplimiento se mantiene bloqueada la promoción, se revisan calidad y faltantes por grupo, se amplía la muestra autorizada o se restringe el alcance. Cualquier cambio de datos, modelo o umbral genera una nueva versión y repite la auditoría completa.

No se aplican automáticamente umbrales específicos ni se ocultan grupos adversos. Si una liberación presenta riesgo de reidentificación, se retira el reporte, se revoca el acceso, se conserva solo la evidencia de auditoría permitida y se repite la revisión de privacidad antes de publicar otra versión.
