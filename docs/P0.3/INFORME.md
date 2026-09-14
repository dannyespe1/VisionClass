# P0.3 — Constructo, protocolo y evidencia

**Versión:** 0.1
**Fecha de corte:** 2026-09-12
**Rama de trabajo:** `p03-constructo-protocolo-evidencia`
**Estado:** informe de preparación; P0.3 todavía no aprobado
**Alcance:** auditoría metodológica y congelamiento documental. No modifica código, datos, modelos ni comportamiento productivo.

## 1. Resultado ejecutivo

VisionClass no dispone hoy de evidencia suficiente para afirmar que mide la atención de una persona. El repositorio usa la misma palabra para tres objetos distintos:

1. una heurística visual basada en presencia y tamaño del rostro, apertura ocular y posición estimada de la mirada;
2. el desempeño en una tarea digital de cancelación visual denominada D2R; y
3. reglas que adaptan cuestionarios y estiman riesgo académico.

Para el estudio se adopta un constructo más limitado: **desempeño atencional en una tarea digital de cancelación visual, bajo condiciones y periodo definidos**. La cámara aporta indicadores de **observabilidad y orientación visual**, no una medición directa de atención. Las notas, progreso e inactividad son resultados académicos distales; tampoco son etiquetas de atención.

La unidad inferencial primaria será el **participante adulto**. Las fases de 20 segundos son medidas repetidas anidadas en sesión y participante. Los frames y las ventanas deslizantes son muestras técnicas correlacionadas y nunca participantes independientes. El protocolo completo está en [PROTOCOLO.md](PROTOCOLO.md) y el plan bloqueado antes de cualquier evaluación de modelos está en [PREREGISTRO_CONFIRMATORIO.json](PREREGISTRO_CONFIRMATORIO.json).

## 2. Alcance poblacional confirmado

- Operación prevista: un tesista.
- País del estudio: Ecuador.
- Población objetivo: estudiantes universitarios de **18 años o más**.
- Menores: fuera del protocolo. La condición de estudiante universitario no prueba la mayoría de edad; la elegibilidad debe verificar ambas condiciones.

Esto corrige la premisa inicial registrada durante P0.2. No se requiere consentimiento de representante ni asentimiento porque el estudio no admite menores. Si se cambia esta condición, este protocolo queda invalidado y se requiere una enmienda ética y metodológica antes de reclutar.

## 3. Evidencia comprobada en el repositorio

| ID | Evidencia observada | Ubicación | Consecuencia metodológica |
|---|---|---|---|
| E01 | La heurística declara que combina rostro, apertura ocular y desviación de mirada; el score MediaPipe pondera 0.5, 0.4 y 0.1. | `ml/ml_service.py:131-138`, `:267-288` | Es un índice diseñado por regla, no una escala validada de atención. |
| E02 | El fallback Haar pondera tamaño del rostro, detección de ojos y una “confianza” derivada también del tamaño. | `ml/ml_service.py:163-206` | Cambia la definición del score según la librería disponible; sus valores no son intercambiables. |
| E03 | Sin rostro el resultado de frame es `None`, pero la agregación temporal produce 0 cuando no hay scores y el payload persiste ese valor. | `ml/ml_service.py:213-221`, `:291-325`, `:467-490` | La no observabilidad puede convertirse en baja “atención”; sesga resultados y cobertura. |
| E04 | El servicio recibe y decodifica imágenes; con `SAVE_FRAMES=1` conserva JPEG y mantiene crops en memoria para CNN-LSTM. | `ml/ml_service.py:390-451` | La señal visual no es solo un dato derivado. Su uso como evidencia requiere el tratamiento de P0.2. |
| E05 | La tarea tiene 14 fases de 20 s y calcula `TR`, aciertos `TA`, omisiones `O`, comisiones `C` y `CON=TA-C`. | `frontend/app/d2r/page.tsx:13-16`, `frontend/app/d2r/test-widget.tsx:42-116` | La fase es una medida repetida apropiada; `CON` describe desempeño, no atención latente por sí solo. |
| E06 | `raw_score=TA`, `attention_span=CON`, `processing_speed=TA/280 s`. | `frontend/app/d2r/page.tsx:98-120`, `:146-166` | Los nombres persistidos sobreinterpretan métricas conductuales y pierden matices de velocidad/precisión. |
| E07 | La matriz “D2R” es un placeholder generado, no la matriz fija licenciada. | `frontend/app/d2r/d2r-rows.ts:1-8`, `:31-55` | No se puede afirmar equivalencia con d2-R, aplicar baremos ni publicar percentiles normativos. |
| E08 | Reproduciendo el generador se obtienen 3–15 objetivos por fase (107 total). | comando de verificación V04 | `TA` y `CON` crudos no son comparables entre fases; la métrica primaria debe normalizar oportunidades. |
| E09 | Los exportadores construyen `y` con F1 de TA/C/O más velocidad y emparejan esa etiqueta con señales visuales de la misma fase. | `backend/api/management/commands/export_d2r_attention_dataset.py:23-40`, `:96-128`; `export_d2r_frames_dataset.py:23-40`, `:64-100` | Existe contaminación de criterio: el target es una fórmula interna, no una etiqueta independiente del constructo. |
| E10 | Un script entrena todos los datos sin partición; otro separa por usuario, pero baraja sin semilla y aplica transformaciones aleatorias también a validación y prueba. | `ml/train_model.py:91-113`; `ml/train_cnn_lstm.py:80-96`, `:150-171` | La evaluación actual no es reproducible; el primer flujo tiene fuga extrema y el segundo no produce un test estable. |
| E11 | El backend usa umbrales del score para dificultad de quiz, abandono y seguimiento. | `backend/api/views.py:945-976`, `:1439-1456`, `:1540-1579` | Un proxy no validado ya puede generar decisiones educativas; debe quedar fuera del estudio confirmatorio y sin interpretación causal. |
| E12 | No hay instrumento de autoinforme, anotación independiente ni versión de protocolo en los modelos o exportadores inspeccionados. | búsqueda estática V03 y esquema actual | No hay criterio externo que permita evaluar validez convergente o separar atención, orientación y calidad técnica. |

## 4. Inferencias de la auditoría

Estas conclusiones se derivan de E01–E12; no son hechos observados en participantes:

- La mirada centrada puede coincidir con orientación a la pantalla, pero no demuestra que la persona procese el contenido. La atención encubierta también puede cambiar sin movimiento ocular.
- Ojos cerrados, rostro pequeño o rostro ausente pueden deberse a parpadeo, postura, iluminación, dispositivo, discapacidad, contenido fuera de pantalla o retiro de cámara. Tratarlos como distracción produciría error de medición diferencial.
- Asociar el score visual con un target calculado a partir del mismo flujo D2R podría mostrar capacidad para reproducir reglas y condiciones técnicas, sin validar el constructo.
- La etiqueta de riesgo académico añade una inferencia de segundo orden sin diseño causal y puede amplificar el error original.
- La variación del número de objetivos por fase confunde cambios longitudinales con dificultad de la matriz placeholder si se usan conteos crudos.

## 5. Definición operacional adoptada

### 5.1 Lo que significa “atención” en P0.3

El estudio evaluará **el desempeño de un estudiante adulto al seleccionar estímulos objetivo e inhibir respuestas a distractores durante una tarea digital de cancelación visual de 14 fases y 20 segundos por fase**. Sus indicadores separados son:

- discriminación de objetivos: precisión, exhaustividad y F1 por fase;
- velocidad: respuestas y avance por tiempo, analizada por separado;
- estabilidad temporal: cambio de desempeño entre fases;
- experiencia declarada: autoinforme retrospectivo inmediato de estar enfocado en la tarea;
- comportamiento visible: orientación observable hacia la pantalla o material de la tarea;
- observabilidad técnica: proporción de ventanas en las que la señal requerida es evaluable.

La métrica confirmatoria primaria será `F1_tarea = 2 × precisión × exhaustividad / (precisión + exhaustividad)`, donde `precisión=TA/(TA+C)` y `exhaustividad=TA/(TA+O)`. Si ambos denominadores son cero, el valor será 0. Velocidad, `CON`, cámara y notas no forman parte de esta métrica.

### 5.2 Lo que no puede inferirse

Ni la tarea, ni un observador, ni la cámara permiten concluir por sí solos:

- atención general, atención fuera de la tarea o rasgos estables de la persona;
- comprensión, aprendizaje, inteligencia, motivación, intención o honestidad académica;
- diagnóstico, TDAH, fatiga clínica, salud mental, emoción o estado médico;
- que mirar la pantalla equivale a procesar su contenido;
- que apartar la mirada, cerrar los ojos o no aparecer en cámara equivale a distracción;
- causalidad entre un score y calificaciones, abandono o progreso;
- equivalencia con el instrumento d2-R, sus baremos o percentiles;
- validez para otra universidad, país, edad, idioma, dispositivo o contexto sin evidencia nueva.

## 6. Unidad de análisis y fuentes de evidencia

| Nivel | Uso permitido | Uso prohibido |
|---|---|---|
| Participante adulto | unidad primaria de inferencia, reclutamiento y partición de datos | contar sus múltiples fases como personas independientes |
| Sesión | contexto de administración; máximo una sesión confirmatoria elegible por participante | elegir retrospectivamente la mejor sesión |
| Fase de 20 s | medida repetida para desempeño, autoinforme y etiqueta observacional alineada | asumir independencia entre fases |
| Evento/clic | reconstrucción de desempeño y control de calidad | etiqueta cognitiva individual |
| Ventana/frame | diagnóstico de observabilidad y futura entrada técnica del modelo | unidad inferencial, “verdad terreno” o baja atención automática |

Jerarquía de evidencia:

1. **Criterio principal:** desempeño conductual normalizado por fase en la tarea.
2. **Criterio convergente:** autoinforme breve, aplicado en fases fijadas antes de reclutar.
3. **Evidencia observacional:** dos anotadores independientes clasifican orientación visible, sin ver scores ni resultados.
4. **Calidad de medición:** dispositivo, iluminación, permiso, rostro detectable, pérdida de señal y motivo de `no_observable`.
5. **Predictor en evaluación posterior:** características visuales y score del modelo, ocultos hasta cumplir P0.3, G3 y el bloqueo del preregistro.
6. **Resultados externos exploratorios:** quiz, progreso, calificación o abandono. No son labels ni endpoints confirmatorios en esta versión.

## 7. Protocolo de anotación resumido

- Ventana fija: una etiqueta por fase de 20 s; las cinco fases con autoinforme son 3, 6, 9, 12 y 14.
- Etiquetas nominales: `orientado_a_tarea`, `orientado_fuera_de_tarea`, `no_observable`.
- `no_observable` exige un motivo: `sin_rostro`, `oclusion`, `iluminacion`, `multiples_personas`, `fallo_dispositivo`, `material_fuera_de_pantalla`, `retiro_consentimiento` u `otro_especificado`.
- La anotación describe conducta visible. Nunca usa `atento`, `distraído`, diagnóstico o intención.
- Dos personas anotan de forma independiente, cegadas al score ML, F1, identidad y anotación ajena. En un estudio presencial pueden registrar en vivo para no conservar material visual. Cualquier grabación requeriría una enmienda específica a P0.2, consentimiento separado, acceso restringido y destrucción comprobable.
- Se informa matriz de confusión y kappa de Cohen con IC bootstrap por etiqueta y total antes de adjudicar. Umbral operativo propuesto para uso confirmatorio: estimación `κ ≥ 0.80` y límite inferior del IC95% `≥ 0.67`; si no se cumple, se revisa el manual y se repite un piloto nuevo, sin reutilizar el piloto fallido como evidencia confirmatoria.
- La adjudicación crea una variable aparte y no reemplaza las etiquetas originales.

## 8. Estrategia de muestra

### Población y reclutamiento

Muestreo consecutivo de voluntarios adultos dentro del marco institucional que se apruebe, con cuotas previas por facultad o área, semestre y tipo de dispositivo cuando el tamaño lo permita. La inferencia se limitará al marco efectivamente cubierto; una muestra de conveniencia de una sola universidad no se presentará como representativa del Ecuador.

### Inclusión

1. edad verificada de 18 años o más;
2. matrícula universitaria vigente en la institución o instituciones aprobadas;
3. participación desde Ecuador dentro de la ventana del estudio;
4. consentimiento informado vigente para el estudio y, de forma separada, para cámara si aplica;
5. comprensión de instrucciones y finalización del ejercicio de práctica estandarizado;
6. primera sesión elegible del participante.

### Exclusión previa a resultados

- menor de 18 años o edad no verificable;
- no pertenecer al marco universitario aprobado;
- ausencia, expiración o revocación del consentimiento;
- registro duplicado o prueba técnica identificada antes de abrir resultados;
- incumplimiento técnico que impida registrar cualquier resultado de la tarea.

No se excluye por score bajo, “mala atención”, `no_face`, cámara denegada, discapacidad, tipo de dispositivo o interrupciones parciales. Esos casos permanecen en el diagrama de flujo, la cobertura y el análisis de datos faltantes. Las adaptaciones de accesibilidad se documentan y se analizan sin atribuir déficit a la persona.

### No respuesta y faltantes

Se publicarán los conteos de invitados, evaluados, elegibles, consentidos, iniciados, completados, observables, incluidos y analizados, con motivos mutuamente excluyentes. Los faltantes se reportarán por variable y fase. El análisis primario usa las fases disponibles bajo el modelo predefinido; no imputa cámara ni convierte `no_observable` a cero. Se hará una sensibilidad por caso completo y por extremos plausibles solo para la conclusión, sin reemplazar el análisis primario.

### Tamaño de muestra

No se fija un número arbitrario. Antes de reclutar se deben aprobar: el efecto mínimo de interés para H1, potencia objetivo, alfa, correlación intraparticipante, proporción esperada de autoinforme fuera de tarea, pérdida y `no_observable`. Con esos valores se simulará el modelo mixto y se congelarán el `N` objetivo y el máximo. Si los recursos imponen un máximo, se publicará el análisis de sensibilidad y las conclusiones se limitarán a efectos detectables. Contar frames no aumenta `N`.

## 9. Hipótesis y análisis congelados

El archivo [PREREGISTRO_CONFIRMATORIO.json](PREREGISTRO_CONFIRMATORIO.json) fija el plan v0.1 antes de acceder a resultados de participantes o evaluar modelos.

- **H1 primaria, validez convergente:** en las fases sondeadas, el autoinforme `en_tarea` se asocia con mayor `F1_tarea` concurrente que `fuera_de_tarea`, ajustando por fase y con intercepto aleatorio por participante.
- **H2 secundaria, convergencia observacional:** entre fases observables, `orientado_a_tarea` se asocia positivamente con el autoinforme `en_tarea`, con intercepto aleatorio por participante.
- **H3 secundaria, estabilidad:** el cambio lineal de `F1_tarea` a lo largo de las 14 fases difiere de cero. Es una prueba bilateral; no se asumirá a priori deterioro.
- **M1 bloqueada, futura evaluación de modelo:** el score visual se comparará con `orientado_a_tarea` únicamente tras G3, con partición por participante y un holdout intacto. No valida atención interna; evalúa clasificación de orientación observable.

Alfa familiar `0.05`; H1 es la única prueba primaria. H2 y H3 se ajustan por Holm. Se informan efecto, IC95%, valor p, cobertura y denominadores. Todo análisis no listado se rotula exploratorio. Ningún resultado autoriza intervención, diagnóstico, cambio de quiz ni etiqueta de abandono.

## 10. Riesgos priorizados

| Prioridad | Riesgo | Escenario de fallo | Corrección mínima / dueño sugerido |
|---|---|---|---|
| P0 | Validez del constructo | El score facial se publica como “atención” y guía decisiones educativas. | Renombrar conceptualmente en protocolo y bloquear uso confirmatorio; tesista + director científico. |
| P0 | Instrumento no validado | El placeholder se presenta como d2-R o se le aplican percentiles. | Usar “tarea digital de cancelación visual”; resolver licencia/validez antes de capturar; director + comité ético. |
| P0 | Contaminación de criterio | Se entrena con `y` derivado de TA/C/O y se afirma validación independiente. | Crear criterios independientes y separar desarrollo/holdout; metodólogo + responsable ML. |
| P0 | No observabilidad convertida en déficit | Cámara ausente produce cero, baja atención o riesgo de abandono. | Mantener `no_observable` separado en datos y análisis; responsable ML + backend. |
| P0 | Hipótesis alteradas tras ver resultados | Se eligen métricas/umbrales con el desempeño observado. | Firmar y registrar hash del preregistro antes de datos; tesista + director. |
| P1 | Pseudorreplicación y fuga | Frames del mismo estudiante aparecen en entrenamiento y prueba o inflan N. | Partición exclusiva por participante; estadístico + ML. |
| P1 | Sesgo de selección/cobertura | Solo se analizan cámaras de alta calidad o quienes terminan. | Diagrama de reclutamiento, cobertura por dispositivo y sensibilidad; tesista. |
| P1 | Baja confiabilidad de anotación | Etiquetas ambiguas se convierten en verdad terreno. | Piloto, doble ciego, κ e IC, manual revisado; coordinador de anotación. |
| P1 | Muestra sin justificación | Resultado impreciso o incapaz de detectar el efecto mínimo. | Simulación de potencia/precisión antes de reclutar; estadístico. |
| P2 | Multiplicidad | Se prueban numerosas métricas hasta obtener significación. | H1 única primaria, Holm para secundarias y rótulo exploratorio; estadístico. |
| P2 | Generalización indebida | Una muestra local se extrapola a todo Ecuador. | Limitar población de inferencia y describir marco; director científico. |

## 11. Decisiones necesarias

| ID | Decisión antes de aprobar P0.3 | Opciones aceptables | Responsable sugerido | Evidencia de cierre |
|---|---|---|---|---|
| D01 | Institución y marco de reclutamiento | una o varias universidades identificadas | tesista + director | protocolo ético con sedes y marco |
| D02 | Situación del instrumento | obtener licencia/permiso y evidencia de equivalencia, o adoptar formalmente la denominación genérica | director científico/jurídico | documento de licencia o cambio aprobado de protocolo |
| D03 | Efecto mínimo y tamaño de muestra | simulación de potencia/precisión con supuestos publicados | estadístico + tesista | script, parámetros, semilla y resultado versionados |
| D04 | Instrumento de autoinforme | texto exacto, opciones, idioma, ventana retrospectiva y fases 3/6/9/12/14 | psicometrista/director | ficha de instrumento aprobada |
| D05 | Modalidad de anotación | observación presencial sin grabar; cualquier grabación exige enmienda P0.2 | comité ético + responsable de privacidad | resolución y procedimiento firmado |
| D06 | Umbral de confiabilidad | aceptar propuesta κ/IC o justificar otro valor antes del piloto | metodólogo | decisión firmada en enmienda |
| D07 | Covariables | lista cerrada de variables indispensables y lícitas | estadístico + privacidad | diccionario y justificación |
| D08 | Custodia del congelamiento | repositorio/registro, firmantes y procedimiento de enmienda | director + tesista | hash firmado y sello temporal externo |

### Adenda de decisiones G0 — 2026-09-14

El formulario saneado [DECISIONES_G0_SANITIZADAS.json](../G0/DECISIONES_G0_SANITIZADAS.json) decide D02, D04, D06 y D07: se adopta tarea propia, se fija el autoinforme, se acepta el umbral κ/IC como criterio y se cierra la lista de covariables. D01, D03, D05 y D08 pasan a **propuesta pendiente de ratificación**: sede ESPE Latacunga, SESOI 0.10 con N 80–100, segundo anotador y registro Zenodo. El preregistro sigue siendo candidato; no se autoriza reclutamiento, apertura de resultados, entrenamiento ni evaluación de modelos.

## 12. Criterios objetivos de aprobación P0.3

P0.3 puede considerarse aprobado solo si existe evidencia versionada de todos estos puntos:

- [ ] D01, D03, D05 y D08 obtienen ratificación independiente; el único `TBD` restante corresponde al umbral de evaluación futura M1 y debe cerrarse antes de G3.
- [ ] Director científico y responsable metodológico firman la definición, límites y endpoints.
- [ ] Comité o instancia ética acepta población adulta, reclutamiento, autoinformes y observación; P0.2 sigue vigente.
- [x] El instrumento se fija como tarea propia de cancelación visual; no se usarán nombre, baremos ni percentiles d2-R sin licencia y equivalencia.
- [ ] El manual de anotación supera un piloto nuevo con κ e IC en el umbral aprobado; se conservan labels originales.
- [ ] El cálculo de muestra está versionado y usa participantes como `N`, con pérdidas y correlación intraparticipante.
- [ ] Se publican esquema de inclusión/exclusión, diagrama de no respuesta y reglas de faltantes antes de resultados.
- [ ] El preregistro final tiene hash y sello temporal anteriores a consulta de outcomes y evaluación de modelos.
- [ ] Una auditoría confirma partición por participante, holdout bloqueado, `no_observable` separado y semillas registradas.
- [ ] Toda salida visible y todo informe distinguen desempeño de tarea, autoinforme, orientación, observabilidad y predicción.
- [ ] Se documenta que ninguna hipótesis habilita diagnóstico, intervención o inferencia causal.
- [ ] G3 permanece sin aprobar y no se ejecutó entrenamiento ni interpretación de modelos durante P0.3.

## 13. Preguntas abiertas

1. ¿Qué autoridad ratificará ESPE Latacunga como marco de reclutamiento y en qué periodo?
2. ¿La simulación independiente ratifica SESOI 0.10, N objetivo 80 y máximo 100?
3. ¿Quiénes actuarán como segundo anotador, metodólogo y aprobador independiente?
4. ¿Quién ratificará y sellará externamente el preregistro propuesto para Zenodo?

## 14. Referencias metodológicas

- Petersen, S. E. y Posner, M. I. (2012). *The Attention System of the Human Brain: 20 Years After*. https://pubmed.ncbi.nlm.nih.gov/22524787/
- Chica et al. (2016). *Neural Differences between Covert and Overt Attention Studied using EEG with Simultaneous Remote Eye Tracking*. https://pmc.ncbi.nlm.nih.gov/articles/PMC5120114/
- Cohen, J. (1960). *A Coefficient of Agreement for Nominal Scales*. https://doi.org/10.1177/001316446002000104
- Nosek et al. (2018). *The preregistration revolution*. https://doi.org/10.1073/pnas.1708274114
- Lakens, D. (2022). *Sample Size Justification*. https://doi.org/10.1525/collabra.33267
- STROBE Initiative. *Checklist for observational studies*. https://www.strobe-statement.org/checklists/

Las referencias apoyan el diseño metodológico; no validan por sí mismas la tarea ni el modelo de VisionClass.
