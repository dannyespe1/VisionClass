# PR32 — Validez convergente y acuerdo

PR32 incorpora un análisis reproducible que mantiene separados cinco objetos: inferencia del sistema, autoinforme, orientación visible anotada, interacción académica y microevaluación. Calcula acuerdo y asociaciones; no crea una etiqueta única de “atención” ni interpreta asociaciones como causalidad o medición directa de un estado interno.

La evidencia incluida es un fixture sintético determinista. Sirve para verificar el contrato estadístico y el software, pero no permite aprobar validez, acuerdo del instrumento ni generalización.

## Unidad de análisis y muestra

- Unidad inferencial: participante, con fases repetidas dentro de sesión.
- Fixture: 80 participantes sintéticos, una sesión por participante y 14 fases por sesión.
- Bootstrap: remuestreo de participantes completos, no de ventanas individuales.
- Rango congelado: mínimo 80 y máximo 100 participantes.
- Cada estimación informa pares y participantes disponibles; una ventana nunca aumenta por sí sola el tamaño inferencial.
- Las 5 solicitudes de autoinforme corresponden a las fases 3, 6, 9, 12 y 14.

El ejecutor rechaza sesiones incompletas, fases duplicadas, muestras fuera del rango, probabilidades inválidas, autoinformes implícitos y señales no observables con una probabilidad inventada.

## Estimaciones

### Acuerdo

Se informa kappa de Cohen para las cuatro categorías originales y para el subconjunto binario donde ambos observadores emitieron `attentive` o `distracted`. Cada kappa incluye acuerdo observado, acuerdo esperado, distribución de prevalencia e intervalo percentil de 95 % mediante bootstrap agrupado por participante.

`no_observable` y `uncertain` permanecen como categorías explícitas. No se convierten en `distracted` ni se imputan.

### Validez convergente y asociación temporal

Para autoinforme, consenso de observadores, conteo de interacciones y microevaluación se informa asociación concurrente y desplazamientos de −1 y +1 fase. Los desplazamientos son exploratorios y no establecen dirección causal.

En anclas binarias concurrentes también se calculan sensibilidad, especificidad, Brier, ECE y tabla de calibración usando el umbral congelado `0.5`. El umbral no se selecciona sobre estos resultados.

### Faltantes y discrepancias

El informe cuenta omisiones, respuestas `unsure`, `no_observable`, desacuerdos entre observadores y discrepancias entre fuentes. Una discrepancia describe que los instrumentos no coinciden; no identifica cuál representa un supuesto estado interno verdadero.

## Contrato de entrada real

La entrada es un JSON con esta envoltura:

```json
{
  "data_classification": "real_approved_confirmatory",
  "sample_sufficiency": {
    "approved": true,
    "reference": "referencia-opaca-del-expediente"
  },
  "records": []
}
```

Los registros contienen únicamente claves seudónimas de investigación, fase, tiempo, categorías, métricas minimizadas y razones de calidad. No admiten nombres, correos, identificadores operativos, texto académico, respuestas crudas ni material audiovisual.

La marca `approved` es un control de ejecución y no sustituye la revisión del expediente. El hash de la entrada, configuración, protocolo, manual, código y runtime queda registrado en el resultado.

## Ejecución

Verificación sintética:

```powershell
python -m ml.run_validity_agreement --synthetic --config ml/config/pr32_validity_agreement_v1.json --output-dir docs/PR32 --code-version pr32-synthetic-v1
```

Análisis real aprobado:

```powershell
python -m ml.run_validity_agreement --input <dataset-minimizado.json> --config ml/config/pr32_validity_agreement_v1.json --output-dir <salida-versionada> --code-version <commit>
```

El modo sintético genera archivos con prefijo `SYNTHETIC`; el real aprobado usa `CONFIRMATORY`. Ambos conservan el dataset tabular utilizado y un informe JSON versionado.

## Limitaciones y rollback

Las asociaciones no prueban causalidad, equivalencia de constructos, diagnóstico ni atención interna. Los resultados no se generalizan a otra institución, edad, idioma, dispositivo o contexto sin validación nueva. Las limitaciones obligatorias para consumidores futuros están en `required_ui_disclosure` y en `INTERPRETACION_UI.md`.

Si una revisión identifica dependencia temporal mal tratada o una unidad inflada, se retiran las conclusiones afectadas, se recalcula agrupando por participante o sesión y se publica una nueva versión. La salida anterior conserva su hash y se etiqueta como inválida o exploratoria; nunca se sobrescribe como confirmatoria.
