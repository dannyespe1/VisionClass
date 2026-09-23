# Protocolo demográfico del modelo Edge v1

## Alcance aprobado

- La banda `18-20` es un criterio de inclusión de la cohorte. No se usa para comparar edades ni entra al modelo.
- La única dimensión comparativa es `gender_self_description`, con las categorías voluntarias `masculino`, `femenino` y `otro`. La bóveda las transforma en códigos opacos `g01`, `g02` y `g03`; la banda etaria se conserva como `a01`.
- No responder significa no crear un registro demográfico. Nunca se transforma la omisión en la categoría `otro`.
- El modelo no recibe atributos demográficos y no intenta inferirlos desde imágenes o características faciales.

## Captura y separación

El participante necesita consentimiento vigente para investigación y una confirmación voluntaria adicional. El backend resuelve un pseudónimo de investigación, cifra la respuesta con la clave Fernet de la bóveda y guarda exclusivamente la banda y el código de género. La respuesta no se devuelve al navegador después de guardarse; solo se informa que existe y su fecha de retención. El participante puede retirarla.

La retención predeterminada es de 30 días y nunca supera la expiración del consentimiento de investigación. Cada escritura y retiro queda auditado mediante un digest del pseudónimo, no mediante el pseudónimo original.

## Unidad y métricas

La unidad de remuestreo es el participante y las ventanas son medidas repetidas. Para cada categoría liberable se calculan falsos positivos, falsos negativos, macro-F1, Brier, ECE, cobertura, `no_observable` e intervalos percentiles del 95 % agrupados por participante.

El protocolo exige 80–100 participantes totales y, por categoría, al menos 20 participantes, 100 ventanas observables, 20 etiquetas positivas y 20 negativas. Si una categoría falla, se suprime todo el alcance comparativo de género. La brecha máxima técnica es 0,10 para error, calibración y cobertura; la cobertura mínima es 0,70.

## Umbral y limitación vigente

La configuración `ml/config/model_v1_gender_fairness_audit.json` congela el umbral `0.013582718558609486` del artefacto `masked-gru-observable-evidence-v1-synthetic`. Esto permite reproducir análisis exploratorios del candidato actual, pero no corrige su especificidad sintética insuficiente ni autoriza promoción. Cualquier nuevo modelo o umbral requiere una configuración versionada y una auditoría completa nueva.

## Ejecución

```powershell
python -m ml.run_fairness_audit --synthetic --config ml/config/model_v1_gender_fairness_audit.json --output-dir docs/MODEL_V1/gender-audit-synthetic --code-version <commit>
```

La ejecución con datos reales requiere el sobre protegido, aprobación de suficiencia por grupo, liberación de bóveda y revisión independiente descritos por PR34. No se publican registros protegidos ni se aplican umbrales diferentes por género.
