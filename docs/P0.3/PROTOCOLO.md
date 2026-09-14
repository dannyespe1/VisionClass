# P0.3 — Protocolo operativo de constructo y anotación

**Versión:** 0.1
**Aplicación:** estudio con estudiantes universitarios adultos (18+) en Ecuador
**Estado:** candidato congelado; requiere cierres D01–D08 del informe

## 1. Separación obligatoria de variables

Cada registro y análisis conservará columnas separadas. No se fabricará una etiqueta única de “atención”.

| Familia | Variables mínimas | Interpretación permitida |
|---|---|---|
| Desempeño de tarea | `TA`, `C`, `O`, `target_count`, `F1_tarea`, `CON`, tiempo | conducta en la tarea y fase concretas |
| Autoinforme | `probe_response`, `probe_confidence`, `probe_phase` | experiencia declarada sobre la fase anterior |
| Observación | `annotator_id_pseudo`, `orientation_label`, `reason_no_observable` | conducta visible en una ventana |
| Señal derivada | rostro, EAR, mirada, score, versión de extractor | salida técnica del extractor |
| Calidad/cobertura | permiso, dispositivo, navegador, iluminación categórica, frames esperados/válidos | capacidad de observar, no capacidad cognitiva |
| Resultados externos | quiz, progreso, nota, abandono | resultado académico distal y exploratorio |

## 2. Administración de la tarea

1. Confirmar elegibilidad y consentimiento antes de abrir la tarea.
2. Asignar un identificador seudónimo sin nombre, correo, cédula ni matrícula en el dataset analítico.
3. Registrar versión exacta de matriz, frontend, backend, extractor, protocolo y consentimiento.
4. Ejecutar instrucciones y práctica estandarizadas; la práctica no se analiza.
5. Administrar 14 fases de 20 s. No reiniciar por bajo desempeño.
6. Aplicar el autoinforme después de las fases 3, 6, 9, 12 y 14, referido solo a la fase inmediatamente anterior.
7. Detener captura ante revocación; conservar únicamente lo permitido por P0.2 y registrar el motivo sin material visual.
8. Finalizar con control de integridad y registrar interrupciones sin decidir exclusiones mediante outcomes.

## 3. Autoinforme congelado como candidato

Texto propuesto: **“Durante la fase que acaba de terminar, ¿tu atención estaba principalmente en la tarea?”**

Respuestas cerradas:

- `en_tarea`
- `fuera_de_tarea`
- `no_recuerdo_prefiero_no_responder`

Confianza opcional separada: 1 (muy baja) a 4 (muy alta). La no respuesta nunca se convierte en `fuera_de_tarea`. El texto final y su validación lingüística deben cerrar D04 antes de reclutar.

## 4. Manual de anotación

### 4.1 Unidad

Una fase completa de 20 s. El anotador emite una etiqueta global y, cuando corresponda, marcas de cambio con segundos relativos. La etiqueta global se decide por la condición observada durante más de la mitad del tiempo evaluable. Si el tiempo evaluable es menor de 10 s, la fase es `no_observable`.

### 4.2 Etiquetas

**`orientado_a_tarea`**: cabeza/ojos o interacción motora compatibles con mirar o manipular la pantalla/material autorizado de la tarea durante más de la mitad del tiempo evaluable.

**`orientado_fuera_de_tarea`**: conducta visible compatible con orientar cabeza/ojos o interacción hacia un objeto o actividad ajenos a la tarea durante más de la mitad del tiempo evaluable.

**`no_observable`**: no existe evidencia visible suficiente para asignar una de las dos etiquetas anteriores. No es una categoría intermedia ni un resultado negativo.

La anotación no determina atención interna. Mirar una pantalla puede coexistir con pensamiento ajeno; mirar fuera puede ser necesario para material autorizado o adaptación.

### 4.3 Motivos de no observabilidad

Elegir uno principal y, si es necesario, una nota no identificable:

- `sin_rostro`
- `oclusion`
- `iluminacion`
- `multiples_personas`
- `fallo_dispositivo`
- `material_fuera_de_pantalla`
- `retiro_consentimiento`
- `otro_especificado`

### 4.4 Cegamiento e independencia

- Los dos anotadores desconocen score visual, F1, clics, autoinforme, notas e identidad.
- Anotan por separado y no discuten casos hasta cerrar el lote.
- El orden de participantes se aleatoriza con semilla registrada.
- Las etiquetas originales son inmutables. La adjudicación se conserva en columnas nuevas con autor, fecha y motivo.
- El responsable que define el manual no debe adjudicar por sí solo casos conflictivos.

### 4.5 Entrenamiento y piloto

1. Explicar definiciones y resolver ejemplos sintéticos sin datos reales.
2. Ejecutar un piloto con participantes que no entren al análisis confirmatorio.
3. Calcular matriz de confusión, acuerdo observado, kappa de Cohen y su IC95% bootstrap por participante.
4. Aprobar solo con el umbral fijado en el informe o una enmienda previa.
5. Si falla, revisar reglas y repetir con un piloto nuevo. No seleccionar retrospectivamente los ejemplos que mejoren el coeficiente.

## 5. Control de calidad y faltantes

| Situación | Registro | Tratamiento |
|---|---|---|
| cámara denegada | `permission=denied` | permanece en cohorte de tarea; fuera del subconjunto visual por motivo explícito |
| no se detecta rostro | `no_observable/sin_rostro` | nunca cero, distracción ni imputación |
| fase parcial | duración y motivo | incluida por modelo mixto si conserva outcome; sensibilidad de caso completo |
| autoinforme omitido | `no_respuesta` | faltante explícito; no se sustituye |
| retiro | hora y alcance autorizado | detener captura; aplicar P0.2 y excluir usos posteriores según consentimiento |
| sesión duplicada | orden temporal y regla | primera sesión elegible; decisión previa a outcomes |
| fallo total de tarea | motivo técnico | cuenta en flujo de participantes, no tiene outcome inventado |

## 6. Dataset analítico y partición futura

- Clave jerárquica: `study_version / participant_pseudo / session / phase / event_or_window`.
- El dataset confirmatorio no contiene identidad directa ni rutas de imágenes.
- La tabla de anotación, autoinforme, task outcomes y señales se enlaza por claves seudónimas y tiempo, sin sobrescribir fuentes.
- Todo split de desarrollo, validación y prueba se realiza primero por participante. Si hay varias instituciones, el análisis informa centro y se considera un holdout institucional.
- El holdout se bloquea antes de entrenar. Ninguna transformación aleatoria se aplica durante evaluación.
- Las ventanas solapadas del mismo participante permanecen en la misma partición y no cambian el tamaño inferencial.

## 7. Trazabilidad de una ejecución

Registrar como mínimo:

- identificador y hash del protocolo y preregistro;
- versión de tarea/matriz y conteo de objetivos por fase;
- commit de código, configuración, entorno y reloj;
- reglas de elegibilidad y motivo de cada exclusión;
- versión de manual y anotadores seudónimos;
- fórmula y código de métricas;
- semilla de cualquier aleatorización;
- diccionario, esquema y hash del dataset;
- análisis ejecutados, desviaciones y enmiendas fechadas;
- denominadores de participantes, sesiones, fases y ventanas.

## 8. Procedimiento de enmienda

Después del sello temporal, cualquier cambio crea una nueva versión y un archivo de enmienda que indique: campo anterior, campo nuevo, motivo, quién lo autorizó, fecha y si se habían visto outcomes o scores. La versión anterior y sus hashes se conservan. Si el cambio se decide tras observar resultados, el análisis afectado pasa a exploratorio y requiere datos nuevos para volver a ser confirmatorio.
