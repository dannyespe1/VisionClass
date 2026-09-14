# P0.4 — Umbrales cuantitativos, gates y suspensión del piloto

**Versión:** 0.1
**Fecha de corte:** 2026-09-12
**Rama:** `p04-umbrales-gates-piloto`
**Estado:** línea base propuesta; P0.4 y G0 no aprobados
**Alcance:** análisis y preparación. No cambia código, configuración, infraestructura, modelos ni datos.

## 1. Resultado ejecutivo

Se fijan umbrales iniciales para un **piloto shadow con adultos**, sin decisiones educativas automáticas. Los valores son límites de aceptación que deben demostrarse con telemetría sin datos personales, pruebas sintéticas y evidencia metodológica; no describen el rendimiento actual.

La capacidad autorizable del flujo visual es hoy **cero participantes**, porque no existen límites de cola o contrapresión, límites de request, métricas SLI, configuración reproducible de CPU/memoria/concurrencia, idempotencia, rollback ensayado ni evidencia de carga. El objetivo de validación previo al piloto es cinco participantes simultáneos a 2 frames/s cada uno (10 requests/s) durante 30 minutos y un pico de ocho participantes (16 requests/s) durante 5 minutos. Superar esos números no aumenta automáticamente el alcance del estudio.

Los gates cuantitativos se publican en [UMBRALES.json](UMBRALES.json), sus responsables y revisiones en [REGISTRO_GATES.csv](REGISTRO_GATES.csv), y el procedimiento operativo en [RUNBOOK_SUSPENSION_ROLLBACK.md](RUNBOOK_SUSPENSION_ROLLBACK.md).

## 2. Modos y alcance permitido

| Modo | Uso de cámara/modelo | Efecto sobre participante | Estado inicial |
|---|---|---|---|
| `core_sin_camara` | desactivado | tarea y funciones básicas | bloqueado hasta G0 |
| `shadow_visual` | calcula solo tras consentimiento y controles P0.2 | ninguno; resultado oculto y no accionable | bloqueado hasta G04-0…G04-6 |
| `asistivo` | salida visible o recomendación revisada por humano | puede influir en enseñanza | fuera de P0.4; prohibido en piloto |
| `automatico` | modifica quiz, riesgo, acceso o seguimiento | decisión automatizada | prohibido |

Una degradación del flujo visual debe conservar `core_sin_camara`, detener la captura, emitir `unknown/no_observable` y evitar cualquier sustitución por cero.

## 3. Evidencia comprobada

| ID | Evidencia del repositorio | Ubicación | Implicación |
|---|---|---|---|
| E01 | D2R inicia un envío cada 500 ms sin guard de solicitud en vuelo. | `frontend/app/d2r/page.tsx:203-258` | 2 requests/s por participante y solicitudes solapables. |
| E02 | Curso envía cada 1 s; captura 640×480 JPEG 0.8 y tampoco impide concurrencia. | `frontend/app/student/course/[courseId]/page.tsx:535-578`, `:677-709` | 1 request/s por participante; el tamaño no está limitado en servidor. |
| E03 | Cada frame pasa por frontend proxy, consulta `/api/me/`, llama ML y ML postea un evento al backend. | `frontend/app/api/attention-proxy/route.ts:13-69`; `ml/ml_service.py:336-351`, `:380-495` | Una muestra visual genera múltiples operaciones síncronas y dependencias en serie. |
| E04 | Proxy corta a 5 s; el post ML→backend admite 10 s; `apiFetch` general no tiene timeout. | `frontend/app/api/attention-proxy/route.ts:11-16`, `:79-96`; `ml/ml_service.py:348-351`; `frontend/app/lib/api.ts:5-49` | Los deadlines no están alineados y pueden dejar trabajo huérfano. |
| E05 | El proxy devuelve HTTP 200 también para token inválido, timeout y error ML. | `frontend/app/api/attention-proxy/route.ts:17-34`, `:54-96` | Un SLI basado solo en status HTTP contaría fallos como éxito. |
| E06 | El health check del proxy consulta `/docs`; `/health` de ML siempre devuelve `ok` sin verificar modelo, detectores ni backend. | `frontend/app/api/attention-proxy/route.ts:100-133`; `ml/ml_service.py:354-366` | No hay readiness de extremo a extremo. |
| E07 | ML conserva dos diccionarios globales por session id; cada buffer de crops guarda hasta 16 tensores float32 3×224×224 y no hay TTL. | `ml/ml_service.py:22-28`, `:88-89`, `:433-451` | Aproximadamente 9.19 MiB de crops por sesión, acumulables y distintos entre instancias. |
| E08 | No aparecen Redis, broker, Celery, DLQ, retry policy, rate limiting, request-size limit, Prometheus ni trazas propias. | búsqueda estática V03; manifiestos de dependencias | No existe cola gestionada ni evidencia instrumental de los SLO. |
| E09 | Render no fija plan, CPU, memoria, instancias, concurrencia o health check; Cloud Run tampoco fija esos parámetros. | `render.yaml`; `gcp/README.md:39-72` | El presupuesto de recursos y la concurrencia dependen de defaults/proveedor. |
| E10 | La guía Cloud Run propone `db-f1-micro`, servicios públicos y Secret Manager, pero no backup, HA ni rollback. | `gcp/README.md:20-72` | Es una receta de arranque, no una configuración aprobada para piloto. |
| E11 | Compose contiene credencial de BD literal y ejecuta servidores de desarrollo; solo Postgres tiene `restart`. | `docker-compose.yml:1-38` | No sirve como evidencia de disponibilidad, seguridad ni recuperación productiva. |
| E12 | El backend actualiza conteo/media mediante read-modify-write sin transacción ni clave idempotente. | `backend/api/views.py:668-706`, `:787-823`; modelos de eventos | Peticiones concurrentes o repetidas pueden perder o duplicar agregados. |
| E13 | El score puede cambiar dificultad y alimentar una etiqueta de riesgo académico. | `backend/api/views.py:946-976`, `:1540-1579` | El piloto debe aislar estas salidas; no hay evidencia para uso accionable. |
| E14 | P0.2 mantiene abiertos consentimiento efectivo, transmisión de frames, retención, proveedores y restore; P0.3 mantiene ocho decisiones científicas abiertas y G3 bloqueado. | `docs/P0.2/INFORME.md`; `docs/P0.3/INFORME.md`; preregistro P0.3 | No se cumplen dependencias para activar cámara o evaluar modelo. |

## 4. Inferencias y límites

- La tasa nominal de 2 frames/s no es capacidad demostrada. Con 5 s de timeout, un participante podría acumular hasta unas diez solicitudes iniciadas si el navegador y servidor lo permiten.
- El estado global de ML no puede considerarse fuente distribuida: escala horizontalmente con historiales distintos y retiene sesiones terminadas.
- Medir solo uptime o HTTP 2xx ocultaría fallos semánticos del proxy.
- El límite de cinco participantes es un punto inicial de prueba compatible con un piloto pequeño; no se deriva de benchmark existente.
- Los presupuestos de CPU, memoria y coste son topes de gobierno. La carga debe demostrar que bastan; no se incrementan silenciosamente para “hacer pasar” el gate.
- No existe evidencia empírica para calibración, cobertura, validez o equidad. Los mínimos de este documento son criterios de no despliegue, no resultados actuales.

## 5. SLO y presupuesto de error

Ventana: siete días móviles y, durante sesiones programadas, una ventana adicional por sesión. Se excluyen únicamente pruebas sintéticas etiquetadas y mantenimiento anunciado; fallos de proveedores consumen presupuesto porque afectan al participante.

| ID | SLI medido desde | SLO | Presupuesto / acción |
|---|---|---|---|
| SLO-01 recorrido básico | navegador: inicio elegible hasta resultado persistido una sola vez | ≥99.0% de sesiones técnicas válidas | 1.0%; agotado ⇒ congelar nuevas sesiones |
| SLO-02 API básica | navegador/proxy, éxito semántico; 4xx atribuibles a input sintético excluidos | ≥99.0%; p95≤500 ms; p99≤1500 ms | cualquiera de los tres incumplido ⇒ gate operativo falla |
| SLO-03 frame shadow | navegador hasta respuesta terminal `ok` o `no_observable` | ≥98.0%; p95≤400 ms; p99≤1000 ms; deadline duro 2000 ms | 2.0%; frame vencido se descarta y nunca acciona |
| SLO-04 persistencia crítica | evento aceptado hasta commit verificable | ≥99.9% exactamente una vez; 100% para consentimiento/revocación | cualquier pérdida de consentimiento ⇒ suspensión inmediata |
| SLO-05 frescura | edad del frame al producir salida | ≥99.0%≤2 s; 100% de salidas accionables dentro de edad | toda salida >2 s es `unknown` y se descarta |
| SLO-06 readiness | sonda que verifica proxy, extractor y backend sin guardar frame | ≥99.0% de minutos programados | sonda superficial no cuenta como evidencia |

El presupuesto se calcula como `eventos_buenos / eventos_elegibles`, con numerador y denominador conservados. Un incidente que consuma ≥20% del presupuesto semanal exige postmortem; un burn rate ≥2 durante 15 minutos congela nuevas sesiones; presupuesto agotado bloquea todo cambio salvo seguridad, privacidad o confiabilidad.

## 6. Cola, contrapresión y carga

No se autoriza una cola de imágenes persistente. El flujo visual debe privilegiar la muestra más reciente:

- máximo por participante: 1 frame procesándose y 1 slot reemplazable pendiente;
- máximo global en la configuración piloto: 10 frames aceptados entre proceso y espera;
- edad máxima pendiente: 1 s en D2R y 2 s en curso;
- al superar límite: reemplazar el pendiente antiguo, incrementar `dropped_backpressure` y no reintentar;
- reintentos de frames y DLQ con imágenes: 0;
- bytes crudos almacenados en cola, disco, logs o DLQ: 0;
- solo eventos críticos no visuales pueden usar cola durable: máximo 100, aviso a 30 s, suspensión a 60 s, tres intentos con clave idempotente y cero DLQ sin resolver antes del análisis.

Prueba mínima de carga con imágenes sintéticas no biométricas:

1. 5 participantes D2R × 2 frames/s = 10 requests/s durante 30 min;
2. pico de 8 × 2 = 16 requests/s durante 5 min;
3. 5 min con ML no disponible para comprobar degradación, descarte y recuperación;
4. reenvío y concurrencia de eventos críticos para comprobar idempotencia;
5. todos los SLO, límites y presupuestos de recursos deben cumplirse sin aumentar topes durante la ejecución.

## 7. Presupuesto de recursos del piloto

| Recurso | Tope de configuración | Tope operativo | Condición de gate |
|---|---|---|---|
| Frontend | 1 vCPU, 512 MiB, concurrencia 20, máximo 2 instancias | CPU p95≤70%; memoria p95≤70%, máxima≤85% | sin OOM/restart en carga |
| Backend | 1 vCPU, 1 GiB, concurrencia 20, máximo 2 instancias | CPU p95≤70%; memoria p95≤70%, máxima≤85% | p99 API y persistencia dentro de SLO |
| ML | 2 vCPU, 2 GiB, concurrencia 2, máximo 5 instancias; mínimo 1 solo durante sesiones | CPU p95≤75%; memoria p95≤70%, máxima≤85% | 10 rps sostenidos y pico 16 rps dentro de SLO |
| Estado ML | ≤10 sesiones y TTL≤5 min; ≤100 MiB total de buffers | cero claves de sesión tras TTL | prueba de liberación y aislamiento multiinstancia |
| Base de datos | conexiones app ≤10 por instancia y total≤70% del máximo real | CPU/almacenamiento/conexiones p95≤70% | lock/race/duplicados dentro de SLO-04 |
| Requests visuales | JPEG≤300 KiB; dimensiones decodificadas≤640×480; cuerpo total≤350 KiB | rechazo temprano por encima del límite | no decodificar ni loguear cuerpo rechazado |
| Persistencia visual cruda | 0 bytes | 0 bytes | cualquier byte ⇒ suspensión |
| Datos derivados | ≤5 MiB por participante y ≤1 GiB para el piloto | alerta al 80% | inventario y borrado P0.2 verificados |
| Logs/trazas | ≤250 MiB/día, sin PII ni payloads, retención≤7 días | alerta al 80% | escaneo de secretos/PII y borrado probado |
| Coste nube | ≤USD 75 por mes de piloto | alerta al 70%; parada al 100% | director aprueba factura/proyección |

Los límites de proveedor deben declararse como configuración versionada. Si el proveedor no permite estos valores exactos, se requiere una enmienda previa; no se asume equivalencia entre Render y Cloud Run.

## 8. Mínimos de calibración, cobertura, validez y equidad

Todas las métricas usan holdout cerrado, bootstrap por participante e IC95%. Una muestra insuficiente produce `evidencia_insuficiente`, nunca aprobación.

### Calibración

Aplicable solo si el score se define como probabilidad de `orientado_a_tarea`:

- `|intercepto_calibración| ≤ 0.10`;
- pendiente entre `0.80` y `1.20`;
- ECE con 10 bins de igual frecuencia `≤0.05` y límite superior IC95% `≤0.10`;
- Brier score `≤90%` del baseline constante de prevalencia;
- curva y conteo por bin publicados.

Un score heurístico sin significado probabilístico falla el gate de calibración; no se lo “calibra” cambiando etiquetas después de abrir el holdout.

### Cobertura

- ventanas con resultado evaluable: `≥90%` global y `≥80%` en cada grupo técnico o poblacional aprobado;
- diferencia absoluta de cobertura entre grupos: `≤10` puntos porcentuales;
- sesiones con al menos 80% de fases evaluables: `≥85%`;
- señal insuficiente marcada `unknown/no_observable`: `100%`, nunca cero;
- denominador incluye permisos denegados y fallos de dispositivo cuando se informa cobertura de reclutamiento.

### Validez

- confiabilidad observacional P0.3: `κ≥0.80` y límite inferior IC95% `≥0.67`;
- H1 de P0.3: dirección positiva, límite inferior IC95% `>0` y efecto igual o superior al SESOI que cierre D03;
- H2: odds ratio `>1` y límite inferior IC95% `>1`;
- futuro modelo M1: límite inferior IC95% de AUROC `≥0.75`, sensibilidad `≥0.80`, especificidad `≥0.80` y mejora AUPRC absoluta `≥0.15` sobre prevalencia;
- reproducibilidad: diferencia absoluta de cada métrica primaria entre dos ejecuciones con mismo artefacto/datos `≤0.005`.

Estas reglas solo evalúan orientación visible y evidencia convergente de la tarea. No habilitan diagnóstico, causalidad ni medición de atención general.

### Equidad

Los grupos poblacionales requieren aprobación ética y justificación de minimización en D07 de P0.3. Dispositivo, navegador, uso de gafas informado voluntariamente y adaptación de accesibilidad son ejes técnicos mínimos cuando proceda.

- brecha absoluta de sensibilidad `≤0.10`;
- brecha absoluta de tasa de falsos positivos `≤0.10`;
- brecha absoluta de ECE `≤0.05`;
- brecha de cobertura `≤0.10`;
- límite superior IC95% de cada brecha de error `≤0.15`;
- mínimo para conclusión por grupo: 30 participantes y 100 ventanas observables de cada clase; de lo contrario, `evidencia_insuficiente` y ningún uso accionable.

No se promedian grupos para ocultar un incumplimiento. Durante el piloto shadow se exige cero decisiones adversas basadas en score, independientemente de estas métricas.

## 9. Gates, propietarios y revisiones

El detalle auditable está en [REGISTRO_GATES.csv](REGISTRO_GATES.csv). Las fechas son límites de revisión fijados para esta línea base y deben adelantarse si el piloto se programa antes.

| Gate | Decisión | Propietario responsable | Aprobador | Revisión límite | Estado |
|---|---|---|---|---|---|
| G04-0 | dependencias P0.1–P0.5 y G0 | tesista | director | 2026-09-19 | bloqueado |
| G04-1 | privacidad, ética y seguridad | responsable privacidad | comité/instancia ética | 2026-09-19 | bloqueado |
| G04-2 | capacidad, SLO, colas y recursos | responsable técnico | director | 2026-09-26 | bloqueado |
| G04-3 | integridad, cobertura y trazabilidad | custodio de datos | metodólogo | 2026-09-26 | bloqueado |
| G04-4 | constructo y validez | metodólogo | director científico | 2026-10-03 | bloqueado |
| G04-5 | calibración y equidad | estadístico/ML | comité de revisión | 2026-10-10 | bloqueado |
| G04-6 | autorización de piloto shadow | director | instancia ética/institucional | 2026-10-11 | bloqueado |
| G04-7 | continuidad de cada sesión | operador | director de guardia | diaria y antes de cada sesión | no iniciado |
| G04-8 | cierre, rollback y eliminación | técnico + custodio | director + privacidad | 48 h después del cierre | no iniciado |

El tesista puede ejecutar y reunir evidencia, pero no debe autoaprobar gates de privacidad, ética, validez o equidad.

## 10. No despliegue, suspensión y rollback

### No despliegue

No se inicia el piloto si ocurre cualquiera de estas condiciones:

- P0.1–P0.5 o G0 sin aprobación verificable;
- algún gate G04-0…G04-6 en estado distinto de `PASS`;
- cámara transmite material crudo fuera del dispositivo sin excepción P0.2 aprobada;
- consentimiento/edad/elegibilidad no fallan de forma cerrada;
- no existe modo shadow que impida reglas de quiz, riesgo y notificaciones;
- no existen `unknown/no_observable`, idempotencia, backpressure, observabilidad o rollback ensayado;
- carga, calibración, cobertura, validez o equidad no cumplen, o la muestra es insuficiente;
- despliegue no identifica digest, configuración, esquema compatible, backups y responsable de guardia.

### Suspensión inmediata

- acceso cruzado, exposición de secreto/PII o salida de frame no autorizada;
- participación de un menor o persona sin consentimiento vigente;
- pérdida de un evento de consentimiento/revocación;
- score usado para diagnóstico, sanción, dificultad, riesgo o contacto automático;
- material crudo persistido o incorporado a logs/cola/DLQ;
- incapacidad de detener captura o representar `unknown`;
- corrupción, mezcla de participantes o fuga entre particiones;
- queja o indicio razonable de daño que requiera evaluación.

### Suspensión operativa y congelamiento de ingreso

- error semántico >5% durante 5 min;
- p99 frame >2 s o cola >10/edad >2 s durante 2 min;
- memoria >90%, OOM, reinicio inesperado o conexiones BD >85%;
- burn rate ≥2 durante 15 min o presupuesto semanal agotado;
- pérdida de eventos >0.1% o duplicados >0.1%;
- brecha de cobertura >20 puntos o brecha de error >0.15 en revisión provisional.

El runbook fija detención de captura en ≤5 min, aislamiento en ≤15 min, rollback de aplicación en ≤30 min y decisión de reanudación exclusivamente con evidencia nueva. Restaurar una base de datos no es el rollback predeterminado; solo procede ante corrupción comprobada y con restore ensayado.

## 11. Riesgos priorizados

| Prioridad | Riesgo | Escenario | Corrección mínima / dueño |
|---|---|---|---|
| P0 | Privacidad incompatible con piloto visual | frames salen del dispositivo y podrían persistirse | mantener cámara deshabilitada hasta cierre P0.2; privacidad + técnico |
| P0 | Decisión educativa no validada | score altera quiz o etiqueta abandono | modo shadow verificable y pruebas negativas; backend + director |
| P0 | Capacidad desconocida | intervalos generan trabajo concurrente sin límite | backpressure, límites y carga sintética; técnico |
| P0 | Pérdida/duplicación silenciosa | read-modify-write concurrente corrompe agregados | idempotencia, transacción y reconciliación; backend/datos |
| P0 | Rollback no ejecutable | incidente sin apagado global seguro ni artefacto anterior | kill switch seguro y ensayo; técnico + privacidad |
| P1 | Métrica de disponibilidad falsa | HTTP 200 y `/docs` ocultan fallos | éxito semántico y readiness extremo a extremo; técnico |
| P1 | Fuga de memoria/estado | buffers por sesión nunca expiran y divergen por instancia | TTL, límite y almacenamiento de estado apropiado; ML |
| P1 | Umbral científico sin muestra | promedio aceptable oculta incertidumbre o subgrupos | IC por participante y evidencia insuficiente; estadístico |
| P1 | Recursos/coste por defaults | proveedor escala o agota memoria sin control | configuración versionada y topes; técnico + director |
| P2 | Umbrales iniciales inadecuados | valores propuestos no reflejan experiencia real | revisión mensual sin relajar tras ver resultados; comité de gates |

## 12. Decisiones necesarias

| ID | Decisión | Responsable sugerido | Evidencia exigida |
|---|---|---|---|
| D01 | proveedor y región del piloto | director + privacidad | arquitectura aprobada y contratos P0.2 |
| D02 | coste mensual USD 75 o enmienda previa | director | presupuesto firmado |
| D03 | mecanismo de apagado seguro y dueño de guardia | técnico + director | prueba cronometrada |
| D04 | implementación de SLI y repositorio de evidencia | técnico | dashboard/export reproducible sin PII |
| D05 | cola durable para eventos críticos o flujo síncrono idempotente equivalente | backend/datos | prueba de fallo y reconciliación |
| D06 | SESOI y tamaño de muestra pendientes de P0.3 | estadístico/metodólogo | preregistro P0.3 final sin TBD |
| D07 | grupos de auditoría lícitos y suficientemente poblados | privacidad + estadístico | justificación, consentimiento y conteos mínimos |
| D08 | digest de rollback, compatibilidad de esquema y restore | técnico + custodio | simulacro firmado |
| D09 | autoridad independiente para PASS/FAIL | director/institución | matriz RACI nominada |

### Adenda de decisiones G0 — 2026-09-14

El formulario saneado [DECISIONES_G0_SANITIZADAS.json](../G0/DECISIONES_G0_SANITIZADAS.json) acepta los valores P0.4 como **criterios iniciales**, no como resultados. Define Render provisional, tope USD 75/mes, apagado 5/15/30 minutos, cola crítica de 100 elementos con alerta a 30 s y suspensión a 60 s, cero reintento/DLQ/persistencia para frames y mínimos de 30 participantes y 100 ventanas observables por clase y grupo. `tesista_operador` ejecutará todos los gates; los aprobadores independientes siguen pendientes y los estados permanecen `BLOCKED`/`NOT_STARTED`.

## 13. Criterios objetivos de aprobación P0.4

- [ ] D01–D09 cerradas con nombres y firmas; ningún gate de alto riesgo es autoaprobado por el tesista.
- [ ] Cada SLI tiene consulta o script reproducible, numerador, denominador, ventana y fuente sin PII.
- [ ] Prueba 10 rps/30 min y pico 16 rps/5 min cumple todos los SLO y topes sin cambiar recursos.
- [ ] Backpressure cumple 1+1 por participante, máximo global 10 y cero persistencia/reintento de frames.
- [ ] Fallos de ML, backend y proveedor degradan a `unknown`, detienen captura cuando corresponde y mantienen el core.
- [ ] Consentimiento/revocación demuestra 100% de persistencia y propagación; eventos restantes ≥99.9% exactamente una vez.
- [ ] Readiness extremo a extremo y éxito semántico detectan los fallos que hoy devuelven HTTP 200.
- [ ] Presupuesto de CPU, memoria, conexiones, almacenamiento, logs y coste está configurado y medido.
- [ ] P0.3 finaliza SESOI, muestra, instrumento y grupos antes de probar validez/equidad.
- [ ] Calibración, cobertura, validez y equidad satisfacen todos los mínimos con IC95% y holdout intacto.
- [ ] Muestra insuficiente bloquea uso accionable; no se declara ausencia de sesgo.
- [ ] Modo shadow demuestra cero llamadas o cambios en quiz, riesgo, acceso, notas o notificaciones.
- [ ] Simulacro acredita captura off≤5 min, aislamiento≤15 min y rollback≤30 min.
- [ ] Backup/restore, eliminación y revocación satisfacen P0.2 después del rollback.
- [ ] Todos los gates G04-0…G04-6 están `PASS`, P0.1–P0.5 están aprobados y existe evidencia separada de G0.

## 14. Preguntas abiertas

1. ¿Se usará Render o Cloud Run y en qué región/proyecto contractual?
2. ¿Quién puede apagar captura y revocar credenciales si el único operador ordinario es el tesista?
3. ¿Qué proveedor almacenará métricas, alertas y evidencia de gates?
4. ¿Cuál es el máximo real de conexiones y backup/HA de la base elegida?
5. ¿Qué SESOI, `N` y grupos cerrarán P0.3 antes de validez/equidad?
6. ¿Existe una versión anterior segura, identificada por digest, compatible con el esquema?

## 15. Referencias de diseño

- Google SRE Workbook, *Implementing SLOs*: https://sre.google/workbook/implementing-slos/
- Google SRE Workbook, *Example Error Budget Policy*: https://sre.google/workbook/error-budget-policy/
- NIST, *AI Risk Management Framework 1.0*: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf
- Google Cloud, *Maximum concurrent requests for Cloud Run*: https://cloud.google.com/run/docs/about-concurrency

Estas fuentes orientan la estructura de SLO y riesgo. Los números de P0.4 son decisiones conservadoras para VisionClass y deben validarse; no son umbrales universales ni certificación del sistema.
