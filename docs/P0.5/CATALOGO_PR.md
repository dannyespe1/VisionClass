# Catálogo detallado PR01–PR41

**Estado:** alcance importado; no constituye aprobación ni autoriza implementación.

## Procedencia

- Documento: `Plan_Mejorado_Ejecucion_VisionClass_Prompts_Codex.docx` (`sha256:4352015df2a874707cf725564f1e1d56cbe974fb838b414357f50f9786186134`).
- Extracción: `final_extract.txt` (`sha256:9be008f0a32dbe344fe9596f4ed8ced1b11cef5f62a2001347f3c69c3cb05f58`).
- Fecha de importación: 2026-09-13.
- Contraste de encabezados: 41 en DOCX, 41 en extracción, coincidencia exacta.
- Representación normativa estructurada: `PLAN_PR_DETALLADO.json`.

Los prerrequisitos se conservan literalmente en `dependency_text`. `repository_dependencies` solo normaliza identificadores P0, G y PR; las aprobaciones y evidencias descritas en texto siguen siendo obligatorias.

## PR01 — Registrar la arquitectura objetivo

- **Ola:** Ola 1 Arquitectura identidad y consentimiento
- **Responsable sugerido:** Liderazgo técnico
- **Estimación fuente:** 2 días
- **Componentes:** Arquitectura y documentación
- **Dependencias:** Puerta G0 aprobada
- **Control:** No
- **Objetivo:** Aprobar una decisión arquitectónica que fije responsabilidades, límites de confianza y secuencia de migración.

**Cambios esperados**

- Documentar navegador Edge, BFF de Next.js, Django REST, Redis Streams, motor temporal, PostgreSQL, registro de modelos y bóveda demográfica.
- Definir qué datos pueden salir del dispositivo y qué información nunca se usa para decisiones operativas.
- Registrar alternativas descartadas, consecuencias, responsables y fecha de revisión.

**Pruebas mínimas**

- Revisión cruzada de frontend, backend, ML, investigación y privacidad.
- Comprobar que cada componente tiene entrada, salida, propietario y límite de confianza.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- ADR versionado y aprobado por los responsables técnicos.
- Diagrama lógico coherente con el ADR y con la política de no transmitir imágenes por defecto.
- Backlog posterior referencia el ADR y no introduce componentes contradictorios.

**Riesgo:** Bajo. Una decisión ambigua puede generar implementaciones incompatibles.

**Rollback:** Revertir únicamente el documento y emitir una nueva versión; no se modifica código productivo.

## PR02 — Desacoplar D2R del flujo principal

- **Ola:** Ola 2 Base segura observable
- **Responsable sugerido:** Frontend y backend
- **Estimación fuente:** 3 días
- **Componentes:** Next.js, Django REST y navegación
- **Dependencias:** PR01 y el inventario de dependencias D2R de P0.1
- **Control:** Sí: d2r_enabled
- **Objetivo:** Permitir autenticación, acceso a cursos y captura sin ejecutar D2R ni depender de sus resultados.

**Cambios esperados**

- Retirar redirecciones obligatorias y verificaciones D2R del recorrido principal.
- Mantener temporalmente rutas y datos legados aislados para evitar una eliminación prematura.
- Actualizar navegación, permisos y documentación de usuario.

**Pruebas mínimas**

- Prueba end to end de inicio de sesión, ingreso a curso y captura con D2R deshabilitado.
- Pruebas de regresión para roles de estudiante, docente y administrador.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Ninguna llamada D2R aparece en el flujo principal.
- La plataforma conserva autenticación, cursos y paneles existentes.
- El flag permite restaurar temporalmente el comportamiento anterior durante la transición.

**Riesgo:** Medio. Pueden existir dependencias ocultas en permisos, rutas o reportes.

**Rollback:** Reactivar el feature flag y restaurar la navegación anterior sin recuperar código eliminado.

## PR03 — Cerrar suplantación de identidad

- **Ola:** Ola 1 Arquitectura identidad y consentimiento
- **Responsable sugerido:** Backend y seguridad
- **Estimación fuente:** 4 días
- **Componentes:** Next.js BFF, Django REST y JWT
- **Dependencias:** PR01 y el mapa de autenticación de P0.1
- **Control:** Sí: strict_event_identity
- **Objetivo:** Impedir que el cliente atribuya observaciones o eventos a otro usuario o a una sesión ajena.

**Cambios esperados**

- Derivar user_id y roles exclusivamente del token verificado.
- Vincular session_id con usuario, curso y vigencia en el servidor.
- Rechazar payloads con identificadores discordantes y registrar el intento sin incluir datos sensibles.

**Pruebas mínimas**

- Pruebas negativas con tokens válidos y user_id ajenos.
- Pruebas de sesiones expiradas, roles insuficientes y repetición de eventos.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- No existe endpoint de escritura que confíe en un user_id del cuerpo.
- Los intentos inválidos retornan códigos consistentes y generan auditoría.
- Las pruebas cubren las rutas de eventos y predicciones.

**Riesgo:** Alto. Un cambio estricto puede bloquear clientes antiguos.

**Rollback:** No volver a confiar en user_id enviados por el cliente. Ante incompatibilidad, bloquear escrituras afectadas o habilitar un adaptador servidor temporal que mantenga validación estricta.

## PR04 — Aplicar mínimo privilegio al servicio ML

- **Ola:** Ola 2 Base segura observable
- **Responsable sugerido:** Backend y seguridad
- **Estimación fuente:** 3 días
- **Componentes:** Django REST, FastAPI ML y secretos
- **Dependencias:** PR03
- **Control:** Sí: ml_service_identity
- **Objetivo:** Sustituir credenciales amplias por una identidad de servicio limitada y rotables.

**Cambios esperados**

- Crear scopes específicos para lectura de modelos, consumo de eventos y escritura de inferencias.
- Mover secretos a variables o gestor de secretos y definir rotación.
- Eliminar tokens administrativos y documentar el flujo máquina a máquina.

**Pruebas mínimas**

- Pruebas de autorización por endpoint y scope.
- Prueba de rotación sin interrupción y rechazo de credenciales revocadas.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La identidad ML no administra usuarios ni cursos.
- No hay secretos en repositorio, imagen o logs.
- Las denegaciones se auditan y no revelan información interna.

**Riesgo:** Alto. Scopes incompletos pueden detener el procesamiento.

**Rollback:** No restaurar credenciales administrativas amplias. Desactivar el procesamiento ML afectado o usar una identidad de emergencia de mínimo privilegio, con caducidad y auditoría.

## PR05 — Controlar captura y envíos

- **Ola:** Ola 2 Base segura observable
- **Responsable sugerido:** Frontend y backend
- **Estimación fuente:** 4 días
- **Componentes:** Next.js, WebSocket o REST y cola cliente
- **Dependencias:** PR03 y PR07
- **Control:** Sí: bounded_capture_queue
- **Objetivo:** Evitar acumulación ilimitada de solicitudes y mantener la interfaz estable cuando la red o el servidor se degradan.

**Cambios esperados**

- Aplicar frecuencia máxima, cola acotada y descarte de ventanas obsoletas.
- Agregar cancelación, timeout, reintentos con backoff e idempotencia.
- Mostrar estado de conexión sin afirmar que se procesó una ventana no confirmada.

**Pruebas mínimas**

- Simular alta latencia, pérdida de red y respuestas fuera de orden.
- Medir memoria, tamaño de cola y capacidad de recuperación.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La cola nunca supera el límite configurado.
- Los eventos confirmados no se duplican y los descartados quedan contabilizados.
- La UI permanece utilizable durante la degradación.

**Riesgo:** Medio. El descarte agresivo puede reducir cobertura temporal.

**Rollback:** Volver al perfil conservador de frecuencia y conservar métricas para reajustar límites.

## PR06 — Crear pruebas y observabilidad mínima

- **Ola:** Ola 2 Base segura observable
- **Responsable sugerido:** Equipo completo
- **Estimación fuente:** 5 días
- **Componentes:** CI, frontend, backend y ML
- **Dependencias:** PR02, PR03, PR04, PR05 y PR07
- **Control:** No
- **Objetivo:** Disponer de evidencia automática sobre disponibilidad, errores, latencia y recorridos críticos.

**Cambios esperados**

- Crear health checks diferenciados de vida y preparación.
- Añadir correlation_id desde navegador hasta inferencia persistida.
- Configurar lint, tipos, unitarias, integración y smoke tests en CI.

**Pruebas mínimas**

- Ejecutar smoke test del flujo autenticado y una prueba de fallo deliberado de dependencia.
- Verificar que los logs permiten reconstruir un evento sin exponer imágenes ni tokens.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Pipeline reproducible y verde en rama protegida.
- Panel mínimo con disponibilidad, tasa de error y p95 de latencia.
- Runbook breve para localizar un evento por correlation_id.

**Riesgo:** Medio. Telemetría excesiva puede almacenar datos sensibles.

**Rollback:** Reducir campos de log mediante configuración y borrar índices generados con esquema incorrecto.

## PR07 — Formalizar protocolo y consentimiento

- **Ola:** Ola 1 Arquitectura identidad y consentimiento
- **Responsable sugerido:** Investigación y privacidad
- **Estimación fuente:** 5 días
- **Componentes:** Frontend, Django REST y PostgreSQL
- **Dependencias:** PR01 y aprobación inicial de privacidad, ética y tratamiento de participantes
- **Control:** Sí: consent_v2
- **Objetivo:** Implementar consentimiento informado versionado, revocable y verificable antes de cualquier captura.

**Cambios esperados**

- Modelar versión, finalidad, fecha, alcance, revocación y exclusión de captura.
- Diseñar interfaz comprensible con opción de continuar sin participar cuando el protocolo lo permita.
- Registrar cambios de consentimiento como eventos inmutables.

**Pruebas mínimas**

- Pruebas de consentimiento ausente, expirado, revocado y actualizado.
- Revisión de contenido por investigación, privacidad y accesibilidad.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La captura no inicia sin consentimiento válido.
- La revocación detiene eventos nuevos de forma inmediata.
- La evidencia permite saber qué versión aceptó cada participante.

**Riesgo:** Alto. Un consentimiento confuso invalida el protocolo y reduce confianza.

**Rollback:** Suspender la captura y conservar únicamente registros administrativos permitidos. Nunca habilitar captura sin consentimiento válido.

## PR08 — Separar observaciones y estados inferidos

- **Ola:** Ola 3 Datos contratos e instrumentos
- **Responsable sugerido:** Backend y datos
- **Estimación fuente:** 5 días
- **Componentes:** Django ORM y PostgreSQL
- **Dependencias:** PR07
- **Control:** Sí: temporal_schema_v2
- **Objetivo:** Distinguir datos observados, ventanas agregadas, estados inferidos, incertidumbre e intervenciones.

**Cambios esperados**

- Crear entidades de sesión, observación, ventana, estado, transición e intervención.
- Registrar timestamps de captura, recepción y procesamiento.
- Añadir claves de procedencia y relaciones sin acoplarse a un modelo específico.

**Pruebas mínimas**

- Migraciones hacia adelante y atrás sobre copia de datos de prueba.
- Pruebas de integridad, índices, zonas horarias y sesiones concurrentes.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Una consulta separa inequívocamente señal e inferencia.
- No se pierden registros existentes en la migración.
- El esquema soporta estado no observable y probabilidades por estado.

**Riesgo:** Alto. Una migración extensa puede bloquear o corromper datos.

**Rollback:** Usar migración expandir y contraer, respaldar tablas y mantener lectura del esquema anterior durante la transición.

## PR09 — Registrar modelos y artefactos

- **Ola:** Ola 3 Datos contratos e instrumentos
- **Responsable sugerido:** Datos y ML
- **Estimación fuente:** 4 días
- **Componentes:** Django REST, almacenamiento de artefactos y ML
- **Dependencias:** PR08
- **Control:** Sí: model_registry
- **Objetivo:** Vincular toda inferencia con un modelo identificable, evaluado y recuperable.

**Cambios esperados**

- Registrar versión, hash, algoritmo, características, dataset, métricas, umbrales y estado.
- Definir estados candidato, validado, activo, retirado y bloqueado.
- Separar metadatos en PostgreSQL de artefactos binarios.

**Pruebas mínimas**

- Prueba de integridad de hash y rechazo de artefactos incompatibles.
- Prueba de promoción y retirada sin alterar inferencias históricas.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Toda inferencia referencia un model_id válido.
- Un artefacto retirado no recibe tráfico nuevo.
- La ficha del modelo permite reproducir su evaluación.

**Riesgo:** Medio. Promover una versión incorrecta afecta todas las sesiones.

**Rollback:** Reasignar el alias activo a la versión previa y conservar ambas versiones para auditoría.

## PR10 — Versionar el contrato de eventos

- **Ola:** Ola 3 Datos contratos e instrumentos
- **Responsable sugerido:** Backend y frontend
- **Estimación fuente:** 5 días
- **Componentes:** Next.js, Django REST, ML y JSON Schema
- **Dependencias:** PR08 y PR09
- **Control:** Sí: event_contract_v2
- **Objetivo:** Estabilizar el intercambio de características, calidad, tiempo, dispositivo y consentimiento.

**Cambios esperados**

- Publicar JSON Schema con unidades, rangos, campos obligatorios y valores ausentes.
- Añadir versionado, event_id idempotente y compatibilidad temporal entre versiones.
- Generar fixtures compartidos para frontend, API y ML.

**Pruebas mínimas**

- Pruebas contractuales en productores y consumidores.
- Fuzzing básico de tipos, rangos, duplicados y campos desconocidos.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- CI falla ante cambios incompatibles no versionados.
- Eventos inválidos se rechazan con detalle seguro.
- Fixtures producen interpretación idéntica en los tres componentes.

**Riesgo:** Alto. La divergencia de contratos puede perder eventos silenciosamente.

**Rollback:** Mantener adaptador v1 a v2 y permitir volver al consumidor anterior mientras se corrige la incompatibilidad.

## PR11 — Incorporar Redis

- **Ola:** Ola 4 Estado distribuido retención y bóveda
- **Responsable sugerido:** Backend y plataforma
- **Estimación fuente:** 3 días
- **Componentes:** Docker, Django, FastAPI y Redis
- **Dependencias:** PR06
- **Control:** Sí: redis_enabled
- **Objetivo:** Introducir Redis como dependencia operativa con configuración segura y observable.

**Cambios esperados**

- Añadir servicio, namespaces, autenticación, límites de memoria y política de expiración.
- Crear health checks y configuración por entorno.
- Documentar respaldo, actualización y respuesta a indisponibilidad.

**Pruebas mínimas**

- Pruebas de conexión, autenticación, expiración y caída de Redis.
- Smoke test en desarrollo y CI con configuración equivalente.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Redis inicia de forma reproducible y no queda expuesto públicamente.
- Las claves siguen una convención documentada.
- La caída se reporta sin fallos silenciosos.

**Riesgo:** Medio. Una mala política de memoria puede expulsar estado activo.

**Rollback:** Desactivar uso funcional mediante flag y volver temporalmente al flujo sin procesamiento temporal.

## PR12 — Persistir estado temporal distribuido

- **Ola:** Ola 4 Estado distribuido retención y bóveda
- **Responsable sugerido:** Backend y ML
- **Estimación fuente:** 5 días
- **Componentes:** Redis, FastAPI ML y sesiones
- **Dependencias:** PR10 y PR11
- **Control:** Sí: distributed_state
- **Objetivo:** Mover ventanas y estado de sesión fuera de la memoria del proceso.

**Cambios esperados**

- Crear claves por usuario, curso y sesión con TTL renovable.
- Guardar posición de ventana, calidad acumulada y versión del modelo.
- Aplicar bloqueo o actualización atómica para consumidores concurrentes.

**Pruebas mínimas**

- Reiniciar instancias durante una sesión y comprobar continuidad.
- Ejecutar sesiones simultáneas para detectar mezcla o condiciones de carrera.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- No se mezclan participantes ni cursos.
- El estado activo sobrevive al reinicio previsto.
- El TTL elimina sesiones abandonadas sin borrar sesiones vigentes.

**Riesgo:** Alto. Errores de claves pueden cruzar datos entre sesiones.

**Rollback:** Desactivar el estado distribuido, invalidar el namespace afectado y reconstruir solo desde eventos confirmados.

## PR13 — Procesar eventos con Redis Streams

- **Ola:** Ola 4 Estado distribuido retención y bóveda
- **Responsable sugerido:** Backend y plataforma
- **Estimación fuente:** 7 días
- **Componentes:** Redis Streams, Django y ML
- **Dependencias:** PR12
- **Control:** Sí: stream_pipeline
- **Objetivo:** Crear un flujo durable con backpressure, reintentos e idempotencia para observaciones e inferencias.

**Cambios esperados**

- Implementar productores, grupos de consumidores, acknowledgements y reclamación de pendientes.
- Añadir reintentos acotados y dead letter stream.
- Propagar correlation_id, event_id y versión de contrato.

**Pruebas mínimas**

- Prueba de carga con consumidores lentos, duplicados y reinicios.
- Prueba de recuperación de pendientes y aislamiento de mensajes venenosos.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- No hay duplicación efectiva en persistencia.
- La cola pendiente permanece bajo el umbral acordado.
- Los mensajes fallidos conservan causa y pueden reprocesarse de forma controlada.

**Riesgo:** Alto. Una tormenta de reintentos puede saturar el sistema.

**Rollback:** Pausar consumidores, reducir concurrencia y volver al endpoint síncrono limitado mientras se drena la cola.

## PR14 — Aplicar retención y eliminación

- **Ola:** Ola 4 Estado distribuido retención y bóveda
- **Responsable sugerido:** Backend y privacidad
- **Estimación fuente:** 5 días
- **Componentes:** PostgreSQL, Redis y auditoría
- **Dependencias:** PR07, PR12, PR13 y PR33
- **Control:** Sí: retention_jobs
- **Objetivo:** Ejecutar retención por finalidad y eliminación verificable en todos los almacenes.

**Cambios esperados**

- Definir plazos por observaciones, estados, telemetría y auditoría.
- Crear trabajo idempotente de expiración y flujo de solicitud de eliminación.
- Eliminar o seudonimizar claves relacionadas en PostgreSQL y Redis.

**Pruebas mínimas**

- Prueba con usuario sintético que cubra tablas, streams, claves y exportaciones.
- Verificar reintento seguro tras interrupción del trabajo.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La solicitud produce evidencia de alcance y finalización.
- No sobreviven datos operativos fuera del periodo aprobado.
- Los logs de borrado no contienen los datos eliminados.

**Riesgo:** Alto. Un borrado incompleto crea exposición regulatoria; uno excesivo afecta auditoría.

**Rollback:** Detener el trabajo defectuoso, preservar evidencia mínima de auditoría y corregir reglas. No restaurar datos personales eliminados salvo base jurídica, autorización explícita y política de backups aprobada.

## PR15 — Extraer características en el navegador

- **Ola:** Ola 5 Edge calidad y preparación de datos
- **Responsable sugerido:** Frontend y Edge
- **Estimación fuente:** 8 días
- **Componentes:** Next.js, MediaPipe u ONNX Web
- **Dependencias:** PR10
- **Control:** Sí: browser_extractor
- **Objetivo:** Procesar video localmente y transmitir solo características mínimas necesarias.

**Cambios esperados**

- Integrar detección de rostro, landmarks, mirada, pose y presencia según disponibilidad.
- Liberar cámara, workers y memoria al pausar o abandonar la sesión.
- Impedir subida de frames en el perfil predeterminado.

**Pruebas mínimas**

- Comparar características locales con el extractor de referencia sobre fixtures consentidos.
- Probar navegadores, permisos denegados, múltiples cámaras y suspensión de pestaña.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La red no contiene imágenes ni blobs de video en modo normal.
- La sesión se recupera de cambios de cámara y pestaña.
- Rendimiento y compatibilidad quedan documentados por navegador.

**Riesgo:** Alto. Diferencias entre navegadores pueden alterar la señal.

**Rollback:** Desactivar el extractor local para navegadores no validados y usar modo sin captura, no subida automática de imágenes.

## PR16 — Normalizar características

- **Ola:** Ola 5 Edge calidad y preparación de datos
- **Responsable sugerido:** Frontend, backend y ML
- **Estimación fuente:** 5 días
- **Componentes:** Contrato de eventos y preprocesamiento
- **Dependencias:** PR15
- **Control:** Sí: normalized_features_v1
- **Objetivo:** Asegurar que todos los componentes interpreten las características con las mismas unidades, rangos y tiempos.

**Cambios esperados**

- Definir coordenadas, normalización geométrica, timestamps y ventanas.
- Representar valores ausentes y confianza sin usar ceros ambiguos.
- Versionar extractor y preprocesamiento en cada evento.

**Pruebas mínimas**

- Fixtures dorados ejecutados en TypeScript y Python.
- Pruebas de cambios de resolución, orientación, FPS irregular y rostro parcial.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La representación coincide dentro de tolerancias definidas.
- Cada campo tiene unidad, rango y tratamiento de ausencia.
- Un cambio futuro exige nueva versión del contrato.

**Riesgo:** Alto. Una normalización incoherente invalida modelos y comparaciones.

**Rollback:** Mantener el pipeline anterior por versión y enrutar eventos según feature_version.

## PR17 — Crear puerta de calidad y estado no observable

- **Ola:** Ola 5 Edge calidad y preparación de datos
- **Responsable sugerido:** Datos y ML
- **Estimación fuente:** 6 días
- **Componentes:** Navegador, contrato y motor temporal
- **Dependencias:** PR16
- **Control:** Sí: quality_gate_v1
- **Objetivo:** Evitar clasificaciones forzadas cuando iluminación, oclusión, confianza o continuidad temporal son insuficientes.

**Cambios esperados**

- Calcular calidad por frame y ventana con razones explícitas.
- Definir umbrales iniciales y estado no observable.
- Separar ausencia de rostro, mala señal y falta de datos.

**Pruebas mínimas**

- Casos controlados de oscuridad, oclusión, salida de cuadro y pérdida de frames.
- Análisis de sensibilidad para evitar umbrales arbitrarios.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Las ventanas insuficientes no activan inferencia ni intervención.
- El usuario recibe explicación comprensible y no culpabilizante.
- Las razones de no observabilidad pueden auditarse.

**Riesgo:** Alto. Umbrales severos reducen cobertura; umbrales laxos producen inferencias falsas.

**Rollback:** Volver al conjunto de umbrales validado y recalibrar en shadow mode.

## PR18 — Habilitar perfiles de ejecución Edge

- **Ola:** Ola 5 Edge calidad y preparación de datos
- **Responsable sugerido:** Frontend y plataforma
- **Estimación fuente:** 5 días
- **Componentes:** Next.js, configuración y telemetría
- **Dependencias:** PR17
- **Control:** Sí: edge_profiles
- **Objetivo:** Ofrecer perfiles controlados de frecuencia, resolución, características y ubicación de inferencia.

**Cambios esperados**

- Definir perfiles bajo, balanceado y alto con límites explícitos.
- Registrar cambios de perfil y motivos sin identificar al usuario.
- Permitir selección remota solo dentro de capacidades consentidas.

**Pruebas mínimas**

- Cambiar perfiles durante sesiones y comprobar continuidad.
- Probar dispositivos lentos, pestañas en segundo plano y batería limitada.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Cada evento identifica el perfil utilizado.
- El cambio no mezcla ventanas incompatibles.
- Existe un perfil seguro de respaldo para dispositivos no caracterizados.

**Riesgo:** Medio. Cambios frecuentes pueden introducir oscilación y datos incomparables.

**Rollback:** Fijar el perfil de respaldo y desactivar cambios automáticos hasta PR27.

## PR19 — Construir baselines reproducibles

- **Ola:** Ola 6 Modelado temporal
- **Responsable sugerido:** Datos y ML
- **Estimación fuente:** 6 días
- **Componentes:** Pipeline de datos y entrenamiento
- **Dependencias:** PR16, PR17 y Puerta G3 de preparación de datos
- **Control:** No
- **Objetivo:** Crear referencias estáticas y heurísticas que permitan medir el valor real del modelado temporal.

**Cambios esperados**

- Implementar regla existente y clasificador por ventana.
- Particionar por participante, fijar semillas y versionar configuración.
- Calcular macro-F1, balanced accuracy, calibración y cobertura.

**Pruebas mínimas**

- Repetición exacta desde entorno limpio.
- Prueba que detecte fuga de participantes entre entrenamiento y evaluación.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Artefactos, métricas y splits quedan versionados.
- Los resultados incluyen intervalos y matriz de confusión.
- El baseline usa el mismo contrato de características que modelos posteriores.

**Riesgo:** Medio. Un baseline débil puede exagerar mejoras.

**Rollback:** Congelar una versión revisada y repetir comparaciones cuando cambie el pipeline.

## PR20 — Implementar HMM o modelo de espacio de estados

- **Ola:** Ola 6 Modelado temporal
- **Responsable sugerido:** Datos y ML
- **Estimación fuente:** 10 días
- **Componentes:** Entrenamiento e inferencia temporal
- **Dependencias:** PR19 y protocolo de evaluación congelado
- **Control:** Sí: state_model_v1
- **Objetivo:** Representar atención como estado latente con transiciones, emisiones e inferencia online.

**Cambios esperados**

- Definir estados interpretables y tratamiento de no observabilidad.
- Implementar entrenamiento, filtrado, suavizado y probabilidad posterior.
- Versionar parámetros de transición y emisiones.

**Pruebas mínimas**

- Secuencias sintéticas con transiciones conocidas.
- Pruebas de huecos, ventanas cortas, reinicio y datos fuera de orden.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- El modelo devuelve distribución de estados e incertidumbre.
- Las transiciones cumplen restricciones documentadas.
- El entrenamiento y la inferencia son reproducibles.

**Riesgo:** Alto. Estados mal definidos pueden aparentar significado cognitivo inexistente.

**Rollback:** Retirar el modelo del alias activo y volver a baseline; revisar ontología antes de reentrenar.

## PR21 — Exponer el motor temporal

- **Ola:** Ola 6 Modelado temporal
- **Responsable sugerido:** Backend y ML
- **Estimación fuente:** 6 días
- **Componentes:** FastAPI ML, Streams y Django REST
- **Dependencias:** PR13 y PR20
- **Control:** Sí: temporal_inference_api
- **Objetivo:** Procesar ventanas temporalmente y persistir estados con contrato estable e idempotente.

**Cambios esperados**

- Consumir ventanas validadas desde Streams o endpoint interno.
- Persistir probabilidades, incertidumbre, calidad y model_id.
- Añadir timeouts, límites de tamaño y manejo de versiones.

**Pruebas mínimas**

- Pruebas contractuales y de idempotencia.
- Carga con múltiples sesiones y medición p50, p95 y p99.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Una ventana produce como máximo una inferencia efectiva.
- Errores se clasifican como reintentables o definitivos.
- La respuesta explica calidad y versión sin exponer parámetros sensibles.

**Riesgo:** Alto. La inferencia lenta puede retrasar toda la secuencia.

**Rollback:** Desactivar consumidor temporal y persistir ventanas para reprocesamiento posterior.

## PR22 — Desplegar modelos con shadow mode y rollback

- **Ola:** Ola 6 Modelado temporal
- **Responsable sugerido:** ML y plataforma
- **Estimación fuente:** 6 días
- **Componentes:** Registro, despliegue y telemetría
- **Dependencias:** PR09 y PR21
- **Control:** Sí: model_rollout
- **Objetivo:** Promover modelos de manera gradual y comparar candidatos sin afectar decisiones.

**Cambios esperados**

- Implementar alias por entorno, shadow mode, canary y porcentaje de tráfico.
- Registrar versión elegida y motivo de rollback.
- Definir umbrales automáticos de latencia, error y calibración.

**Pruebas mínimas**

- Ensayo de canary y rollback con modelo defectuoso controlado.
- Comparación de salidas activas y shadow sin contaminación.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La versión previa se restaura sin migrar datos.
- Los usuarios no reciben decisiones provenientes del modelo shadow.
- El despliegue deja evidencia auditable.

**Riesgo:** Alto. Un candidato defectuoso puede afectar sesiones reales.

**Rollback:** Mover alias al modelo estable, detener tráfico canary y reprocesar únicamente si el protocolo lo permite.

## PR23 — Evaluar el modelo dinámico

- **Ola:** Ola 6 Modelado temporal
- **Responsable sugerido:** Datos, ML e investigación
- **Estimación fuente:** 8 días
- **Componentes:** Evaluación y documentación
- **Dependencias:** PR19, PR20, PR21, PR22 y protocolo de evaluación congelado
- **Control:** No
- **Objetivo:** Cuantificar desempeño, calibración, detección de cambios y estabilidad sin fuga entre participantes.

**Cambios esperados**

- Comparar HMM o estado espacial con baselines estáticos.
- Medir demora de cambio, persistencia, cobertura y error por participante.
- Generar intervalos de confianza y análisis de sensibilidad.

**Pruebas mínimas**

- Revisión independiente de splits, métricas y scripts.
- Repetición con al menos dos semillas o particiones cuando aplique.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Informe versionado con protocolo y resultados completos.
- Las conclusiones distinguen clasificación, dinámica y validez del constructo.
- Se documentan fallos y condiciones donde el modelo no debe usarse.

**Riesgo:** Alto. Elegir métricas después de ver resultados puede sesgar conclusiones.

**Rollback:** Congelar el protocolo antes de la evaluación final y marcar cualquier análisis posterior como exploratorio.

## PR24 — Añadir baseline LSTM o GRU

- **Ola:** Ola 6 Modelado temporal
- **Responsable sugerido:** Datos y ML
- **Estimación fuente:** 10 días
- **Componentes:** Entrenamiento temporal
- **Dependencias:** PR19 y Puerta G3 de preparación de datos
- **Control:** Sí: neural_temporal_shadow
- **Objetivo:** Comparar el modelo de estados con una alternativa neuronal entrenada bajo el mismo protocolo.

**Cambios esperados**

- Implementar LSTM o GRU con máscara de valores ausentes.
- Usar los mismos splits, características y métricas del baseline.
- Registrar hiperparámetros, semillas y curvas de entrenamiento.

**Pruebas mínimas**

- Prueba de fuga por participante y overfitting deliberado.
- Comparación reproducible contra PR20 y PR19.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- El artefacto queda registrado como candidato, no activo.
- La comparación incluye coste computacional y calibración.
- Se informa variabilidad entre ejecuciones.

**Riesgo:** Alto. La red neuronal puede mejorar métricas sin ser interpretable ni estable.

**Rollback:** Mantenerla en shadow mode y retirar el artefacto si no supera gates predefinidos.

## PR25 — Exportar inferencia local

- **Ola:** Ola 7 Adaptación validación y equidad
- **Responsable sugerido:** ML y frontend
- **Estimación fuente:** 8 días
- **Componentes:** ONNX, WebAssembly o WebGPU
- **Dependencias:** PR09, PR23, PR24 y decisión documentada de selección del modelo
- **Control:** Sí: local_temporal_model
- **Objetivo:** Ejecutar un modelo elegible en el dispositivo con paridad controlada respecto al modelo de referencia.

**Cambios esperados**

- Exportar a ONNX o formato Web y fijar opset compatible.
- Cuantizar solo después de medir degradación.
- Firmar artefacto y validar hash antes de cargarlo.

**Pruebas mínimas**

- Pruebas de paridad numérica y decisiones sobre fixtures.
- Rendimiento en CPU, WebAssembly y WebGPU disponibles.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La desviación queda dentro del umbral aprobado.
- Un artefacto incompatible no se ejecuta.
- Existe fallback seguro sin enviar imágenes al servidor.

**Riesgo:** Alto. La cuantización puede degradar grupos o condiciones específicas.

**Rollback:** Volver al artefacto sin cuantizar o al modelo de estados y bloquear la versión degradada.

## PR26 — Medir recursos del dispositivo

- **Ola:** Ola 7 Adaptación validación y equidad
- **Responsable sugerido:** Frontend y Edge
- **Estimación fuente:** 6 días
- **Componentes:** Telemetría cliente y backend
- **Dependencias:** PR07 y PR18
- **Control:** Sí: device_budget_telemetry
- **Objetivo:** Medir recursos suficientes para comparar perfiles sin convertir la telemetría en identificación del usuario.

**Cambios esperados**

- Registrar FPS, latencia, memoria disponible, red y estado energético permitido.
- Agrupar clase de dispositivo y evitar identificadores persistentes.
- Aplicar muestreo y retención reducida.

**Pruebas mínimas**

- Validar ausencia de huellas digitales directas en payloads.
- Simular CPU ocupada, red limitada y ahorro de batería.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- La telemetría se asocia al perfil y sesión, no a atributos demográficos.
- El usuario puede excluirse según consentimiento.
- Los valores imposibles se filtran y contabilizan.

**Riesgo:** Medio. La combinación de métricas puede facilitar fingerprinting.

**Rollback:** Desactivar telemetría detallada y conservar solo agregados amplios aprobados por privacidad.

## PR27 — Crear scheduler adaptativo

- **Ola:** Ola 7 Adaptación validación y equidad
- **Responsable sugerido:** ML, frontend y plataforma
- **Estimación fuente:** 10 días
- **Componentes:** Edge, configuración y motor temporal
- **Dependencias:** PR25 y PR26
- **Control:** Sí: adaptive_scheduler
- **Objetivo:** Seleccionar perfil, frecuencia y ubicación de inferencia según presupuesto, calidad y estabilidad.

**Cambios esperados**

- Definir función de decisión con límites y prioridades explícitas.
- Añadir histéresis, tiempo mínimo por perfil y fallback.
- Registrar decisión y métricas que la justifican.

**Pruebas mínimas**

- Pruebas de degradación progresiva y recuperación.
- Pruebas de oscilación, sobrecarga, mala señal y pérdida de red.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Cumple el presupuesto de latencia en escenarios objetivo.
- No cambia de perfil por ruido breve.
- Nunca elude calidad, consentimiento o privacidad para mantener rendimiento.

**Riesgo:** Alto. Una política inestable puede degradar experiencia y datos.

**Rollback:** Desactivar adaptación y fijar el perfil balanceado validado.

## PR28 — Generar benchmark y frontera de Pareto

- **Ola:** Ola 7 Adaptación validación y equidad
- **Responsable sugerido:** ML e investigación
- **Estimación fuente:** 8 días
- **Componentes:** Benchmark, análisis y documentación
- **Dependencias:** PR23 y PR27
- **Control:** No
- **Objetivo:** Caracterizar sistemáticamente cómo cambia el sistema bajo diferentes restricciones computacionales.

**Cambios esperados**

- Ejecutar matriz por dispositivo, perfil, carga y ubicación de inferencia.
- Medir precisión, calibración, latencia, memoria, red y energía aproximada.
- Identificar configuraciones dominadas y frontera de Pareto.

**Pruebas mínimas**

- Repetición de escenarios y control de temperatura y carga.
- Validación del script de agregación y unidades.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Dataset de benchmark, configuración y gráficos reproducibles.
- Recomendaciones separadas por clase de dispositivo.
- Resultados incluyen incertidumbre y condiciones de medición.

**Riesgo:** Medio. Benchmarks de laboratorio pueden no representar el aula.

**Rollback:** Etiquetar conclusiones como controladas y repetir una muestra durante el piloto antes de generalizar.

## PR29 — Capturar autoinforme momentáneo

- **Ola:** Ola 3 Datos contratos e instrumentos
- **Responsable sugerido:** Investigación y frontend
- **Estimación fuente:** 6 días
- **Componentes:** Next.js, Django y protocolo
- **Dependencias:** PR07, PR08 y aprobación metodológica y ética
- **Control:** Sí: momentary_self_report
- **Objetivo:** Obtener una fuente externa breve y temporalmente alineada con las ventanas de atención.

**Cambios esperados**

- Diseñar prompts neutrales, escala, opción de omitir y frecuencia máxima.
- Alinear respuesta con ventana y contexto de recurso.
- Medir carga, demora y patrón de no respuesta.

**Pruebas mínimas**

- Piloto cognitivo de comprensión y accesibilidad.
- Pruebas de timestamps, zonas horarias, duplicados y respuestas omitidas.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- El instrumento tiene versión y justificación.
- La experiencia no bloquea el curso.
- Las respuestas pueden vincularse sin revelar contenido académico innecesario.

**Riesgo:** Medio. Interrumpir demasiado cambia la conducta que se intenta medir.

**Rollback:** Reducir frecuencia o suspender prompts mediante flag y documentar la exposición acumulada.

## PR30 — Integrar interacción académica

- **Ola:** Ola 3 Datos contratos e instrumentos
- **Responsable sugerido:** Backend y frontend
- **Estimación fuente:** 7 días
- **Componentes:** Cursos, eventos y PostgreSQL
- **Dependencias:** PR07, PR08 y PR10
- **Control:** Sí: learning_interaction_events
- **Objetivo:** Incorporar señales de contexto y actividad para triangular inferencias visuales.

**Cambios esperados**

- Registrar recurso, pausa, navegación, actividad y microevaluación con timestamps.
- Minimizar payload y evitar almacenar texto o respuestas cuando no sea necesario.
- Definir eventos comparables entre texto, video y actividades.

**Pruebas mínimas**

- Pruebas de eventos duplicados, desconexión y reanudación.
- Revisión de minimización por tipo de recurso.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Los eventos se alinean con sesiones y ventanas.
- El esquema distingue actividad de aprendizaje y atención inferida.
- La captura respeta consentimiento y retención.

**Riesgo:** Medio. La actividad puede confundirse con atención o desempeño.

**Rollback:** Mantenerla como evidencia separada y desactivar su uso en modelos hasta completar validez.

## PR31 — Crear anotación de observadores

- **Ola:** Ola 3 Datos contratos e instrumentos
- **Responsable sugerido:** Investigación y frontend
- **Estimación fuente:** 10 días
- **Componentes:** Interfaz de anotación y protocolo
- **Dependencias:** PR08 y aprobación metodológica y ética
- **Control:** Sí: observer_annotation
- **Objetivo:** Obtener una referencia humana independiente mediante doble anotación ciega.

**Cambios esperados**

- Definir manual, categorías, entrenamiento y casos de práctica.
- Crear asignación ciega y registro de confianza.
- Seleccionar muestra sin favorecer sesiones fáciles.

**Pruebas mínimas**

- Prueba piloto con discusión de desacuerdos fuera de la muestra final.
- Verificación de cegamiento y completitud de doble anotación.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Cada unidad final tiene dos evaluadores independientes.
- El manual y sus revisiones quedan versionados.
- La interfaz no muestra predicciones del sistema.

**Riesgo:** Alto. Categorías ambiguas reducen el acuerdo y la validez.

**Rollback:** Pausar anotación, revisar manual y repetir entrenamiento antes de continuar la muestra final.

## PR32 — Calcular validez y acuerdo

- **Ola:** Ola 7 Adaptación validación y equidad
- **Responsable sugerido:** Investigación y datos
- **Estimación fuente:** 8 días
- **Componentes:** Análisis estadístico
- **Dependencias:** PR29, PR30, PR31 y evidencia de suficiencia de muestra
- **Control:** No
- **Objetivo:** Cuantificar acuerdo entre evaluadores y convergencia entre inferencias, autoinforme, interacción y microevaluación.

**Cambios esperados**

- Calcular kappa o alpha con intervalos y distribución de prevalencia.
- Analizar asociación temporal, sensibilidad y calibración.
- Examinar discrepancias y no respuesta sin presentar causalidad.

**Pruebas mínimas**

- Revisión de supuestos, unidades de análisis y dependencia temporal.
- Reproducción independiente de una muestra de resultados.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Informe distingue acuerdo, validez convergente y asociación.
- Los tamaños de muestra acompañan cada estimación.
- Las limitaciones del constructo pasan a documentación y UI.

**Riesgo:** Alto. Una unidad de análisis incorrecta puede inflar precisión estadística.

**Rollback:** Recalcular por participante o sesión y retirar conclusiones que no sobrevivan al análisis corregido.

## PR33 — Separar la bóveda demográfica

- **Ola:** Ola 4 Estado distribuido retención y bóveda
- **Responsable sugerido:** Seguridad, privacidad y backend
- **Estimación fuente:** 8 días
- **Componentes:** Servicio o esquema restringido
- **Dependencias:** PR07, PR08 y diseño de protección de datos aprobado en P0.2
- **Control:** Sí: demographic_vault
- **Objetivo:** Guardar atributos voluntarios en un dominio separado que no pueda influir en decisiones operativas.

**Cambios esperados**

- Crear seudónimo de investigación distinto al identificador operativo.
- Aplicar roles, acceso temporal, auditoría y cifrado.
- Bloquear joins desde endpoints operativos y exportaciones generales.

**Pruebas mínimas**

- Pruebas de acceso por roles y consultas prohibidas.
- Revisión de reidentificación, logs y proceso de revocación.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- El motor de atención no puede leer atributos protegidos.
- Todo acceso de investigación queda auditado.
- La eliminación y retención cubren la bóveda.

**Riesgo:** Alto. Una separación incompleta puede permitir uso indebido o reidentificación.

**Rollback:** Deshabilitar la bóveda, revocar accesos y aislar datos hasta completar revisión de seguridad.

## PR34 — Auditar equidad

- **Ola:** Ola 7 Adaptación validación y equidad
- **Responsable sugerido:** Datos, ML e investigación
- **Estimación fuente:** 10 días
- **Componentes:** Evaluación y reportes
- **Dependencias:** PR23, PR32, PR33 y evidencia de suficiencia de muestra por grupo
- **Control:** No
- **Objetivo:** Medir cobertura, error y calibración por grupos e intersecciones con protección estadística.

**Cambios esperados**

- Calcular falsos positivos, falsos negativos, macro-F1, calibración y no observabilidad por grupo.
- Incluir intervalos, tamaños mínimos y supresión de celdas pequeñas.
- Definir criterio de no despliegue y ruta de mitigación.

**Pruebas mínimas**

- Revisión de denominadores, etiquetas, intersecciones y datos faltantes.
- Análisis de sensibilidad a umbrales comunes y específicos, sin aplicarlos automáticamente.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Reporte reproducible con incertidumbre y cobertura.
- No se publican grupos con riesgo de reidentificación.
- Un incumplimiento del gate bloquea promoción del modelo.

**Riesgo:** Alto. Muestras pequeñas pueden producir conclusiones inestables.

**Rollback:** No inferir ausencia de sesgo; ampliar muestra o restringir alcance antes de desplegar.

## PR35 — Construir panel del estudiante

- **Ola:** Ola 8 Producto y operación
- **Responsable sugerido:** Frontend y experiencia
- **Estimación fuente:** 7 días
- **Componentes:** Next.js y API de reportes
- **Dependencias:** PR17, PR23 y PR32
- **Control:** Sí: student_attention_dashboard
- **Objetivo:** Mostrar tendencias personales, incertidumbre y controles de privacidad sin lenguaje diagnóstico.

**Cambios esperados**

- Presentar tendencia por sesión y estado no observable.
- Explicar fuentes, límites y significado de las métricas.
- Incluir pausa, revocación y acceso a política de datos.

**Pruebas mínimas**

- Pruebas de accesibilidad, estados vacíos y datos parciales.
- Sesiones de comprensión con usuarios representativos.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- El estudiante puede distinguir observación de inferencia.
- No existen rankings ni etiquetas permanentes.
- Los controles de privacidad funcionan desde el panel.

**Riesgo:** Medio. Una visualización puede inducir autoevaluaciones incorrectas.

**Rollback:** Desactivar métricas problemáticas y mantener solo información de calidad y control de consentimiento.

## PR36 — Construir panel del docente

- **Ola:** Ola 8 Producto y operación
- **Responsable sugerido:** Frontend e investigación
- **Estimación fuente:** 7 días
- **Componentes:** Next.js y reportes agregados
- **Dependencias:** PR23, PR32 y PR34
- **Control:** Sí: teacher_group_dashboard
- **Objetivo:** Ofrecer agregados de grupo que ayuden a interpretar actividades sin vigilancia individual.

**Cambios esperados**

- Mostrar distribución, tendencia, cobertura e intervalos por actividad.
- Aplicar tamaños mínimos y ocultar estados individuales por defecto.
- Añadir contexto de calidad y advertencias de interpretación.

**Pruebas mínimas**

- Pruebas de autorización, grupos pequeños y combinación de filtros.
- Revisión de riesgo de reidentificación y comprensión docente.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- No se puede inferir un estudiante desde agregados.
- El docente ve cobertura e incertidumbre junto a cada métrica.
- No se generan rankings de alumnos.

**Riesgo:** Alto. Filtros combinados pueden reidentificar personas.

**Rollback:** Reducir filtros, aumentar umbral de grupo y desactivar el panel hasta corregir la agregación.

## PR37 — Construir panel de investigación

- **Ola:** Ola 8 Producto y operación
- **Responsable sugerido:** Frontend, datos y privacidad
- **Estimación fuente:** 8 días
- **Componentes:** Next.js, API y exportaciones
- **Dependencias:** PR28, PR32 y PR34
- **Control:** Sí: research_dashboard
- **Objetivo:** Permitir análisis trazable de modelos, calidad, validez, equidad y recursos bajo acceso restringido.

**Cambios esperados**

- Crear filtros por cohorte, modelo, perfil y periodo.
- Añadir exportación seudonimizada con propósito y caducidad.
- Mostrar procedencia, versión y tamaño de muestra.

**Pruebas mínimas**

- Pruebas de roles, exportaciones, supresión y auditoría.
- Comparación de cifras del panel con consultas reproducibles.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Toda cifra enlaza con modelo y versión de datos.
- Las exportaciones respetan tamaños mínimos.
- Acceso y descarga quedan auditados.

**Riesgo:** Alto. Una exportación flexible puede superar controles del panel.

**Rollback:** Deshabilitar exportación, revocar enlaces y revisar los conjuntos generados.

## PR38 — Implementar intervenciones basadas en reglas

- **Ola:** Ola 8 Producto y operación
- **Responsable sugerido:** Backend e investigación
- **Estimación fuente:** 8 días
- **Componentes:** Motor de reglas, frontend y auditoría
- **Dependencias:** PR23, PR32, PR34, PR35 y aprobación de seguridad de intervención
- **Control:** Sí: conservative_interventions
- **Objetivo:** Activar sugerencias solo ante evidencia persistente, observable y contextualizada.

**Cambios esperados**

- Definir disparadores, enfriamiento, frecuencia máxima y exclusiones.
- Exigir múltiples ventanas y umbral de incertidumbre.
- Limitar cualquier LLM a redactar una variante aprobada; nunca clasifica atención.

**Pruebas mínimas**

- Secuencias sintéticas con ruido, pérdida de señal y cambios reales.
- Pruebas de frecuencia, exclusión y explicación de disparo.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Una observación aislada nunca activa intervención.
- Cada intervención conserva regla, evidencia y versión.
- Existe desactivación global inmediata.

**Riesgo:** Alto. Intervenciones erróneas pueden molestar o estigmatizar.

**Rollback:** Apagar el flag, conservar auditoría y volver a recomendaciones manuales o generales.

## PR39 — Preparar operación y pruebas de carga

- **Ola:** Ola 8 Producto y operación
- **Responsable sugerido:** Plataforma y seguridad
- **Estimación fuente:** 10 días
- **Componentes:** Infraestructura, monitoreo y backups
- **Dependencias:** PR13, PR21, PR22, PR27 y flujos de producto integrados
- **Control:** Sí: production_observability
- **Objetivo:** Demostrar que el sistema mantiene SLO y se recupera de fallos previsibles.

**Cambios esperados**

- Definir SLO, alertas, trazas, capacidad y presupuesto de error.
- Ejecutar carga, caos controlado y restauración de backups.
- Crear runbooks de Redis, base de datos, ML, cola y privacidad.

**Pruebas mínimas**

- Carga objetivo y pico con percentiles de latencia.
- Fallo de instancia, Redis, base de datos y modelo con recuperación medida.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- SLO y límites quedan aprobados.
- Backups restauran datos consistentes.
- Cada alerta tiene propietario y acción documentada.

**Riesgo:** Alto. Una prueba de caos sin aislamiento puede afectar datos reales.

**Rollback:** Ejecutar solo en entorno controlado y restaurar snapshot validado; detener ante pérdida de integridad.

## PR40 — Publicar candidato de piloto

- **Ola:** Ola 9 Piloto y cierre
- **Responsable sugerido:** Liderazgo técnico e investigación
- **Estimación fuente:** 7 días
- **Componentes:** Despliegue, protocolo y soporte
- **Dependencias:** PR34 a PR39 y Puerta G6 aprobada
- **Control:** Sí: pilot_release
- **Objetivo:** Empaquetar una versión candidata con protocolo, soporte, criterios de suspensión y reversión ensayada.

**Cambios esperados**

- Congelar versiones, migraciones, configuración y modelos.
- Completar checklist de seguridad, privacidad, validez, equidad y rendimiento.
- Definir participantes, soporte, comunicación de incidentes y criterio de suspensión.

**Pruebas mínimas**

- Ensayo general del recorrido y rollback.
- Verificación de consentimiento, borrado, alertas y exportación de evidencia.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Todos los gates tienen responsable y evidencia.
- No quedan riesgos críticos sin tratamiento.
- La versión puede suspenderse y revertirse dentro del tiempo acordado.

**Riesgo:** Alto. La presión por iniciar puede omitir gates pendientes.

**Rollback:** No desplegar; mantener la versión en staging hasta cerrar o aceptar formalmente cada riesgo.

## PR41 — Archivar D2R definitivamente

- **Ola:** Ola 9 Piloto y cierre
- **Responsable sugerido:** Frontend y backend
- **Estimación fuente:** 5 días
- **Componentes:** Código, base de datos y documentación
- **Dependencias:** PR02 y PR40
- **Control:** No
- **Objetivo:** Eliminar los restos de D2R una vez demostrada la independencia funcional e histórica.

**Cambios esperados**

- Inventariar rutas, componentes, permisos, tablas, jobs y documentación.
- Crear migración de archivo o eliminación según retención.
- Quitar dependencias, flags y configuraciones residuales.

**Pruebas mínimas**

- Búsqueda estática y pruebas end to end sin referencias activas.
- Ensayo de migración y restauración sobre copia.
- Ejecuta además los comandos relevantes ya definidos por el repositorio: pruebas específicas, lint, typecheck, comprobación de migraciones, contratos o build según corresponda. No inventes comandos si el repositorio no los define. Si una validación no puede ejecutarse, explica la causa y la siguiente comprobación más segura.

**Definición de terminado**

- Build, pruebas y recorridos principales funcionan sin D2R.
- No quedan endpoints, permisos o tablas activas innecesarias.
- El respaldo y la decisión de eliminación están documentados.
- El objetivo y el alcance coinciden con la ficha aprobada.
- Las pruebas automáticas y manuales están adjuntas y son reproducibles.
- Las migraciones y el rollback fueron ensayados cuando aplican.
- No se añadieron imágenes, atributos sensibles o secretos a logs y payloads.
- El contrato, la documentación y la telemetría fueron actualizados.
- El feature flag y su fecha de retirada están definidos.
- La evidencia de la puerta de salida se actualizó si el PR la completa.

**Riesgo:** Medio. Eliminar antes de tiempo puede perder evidencia o romper integraciones ocultas.

**Rollback:** Restaurar el respaldo y el último artefacto etiquetado; no reactivar en producción sin revisión.
