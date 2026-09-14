# P0.1 — Auditoría y línea base de VisionClass

Fecha: 2026-09-07 (America/Guayaquil). Commit: `7f8f9cb987779b6e4df417b3195040a7b4b7dc60`.

**Resultado:** línea base documentada, con fallos reproducidos de autorización e integración ML. Frontend instalable, build y tipos correctos; lint fallido. Backend instalable y checks correctos, pero su suite descubre **cero pruebas**. Este informe prepara decisiones y trabajo posterior; no certifica que la aplicación esté lista para producción.

## 1. Alcance, método y conservación

- Se revisaron primero Git y documentación: `README.md`, `frontend/README.md`, `gcp/README.md`, `DIAGNOSTICO_CAMARA.md`, `INSTRUCCIONES_DEBUG.md`, `SOLUCION_FACEDETECT.md`, inventario de archivos y el generador del documento de estado actual en `docs/build_current_state_doc.py`. El DOCX preexistente no fue modificado ni usado como evidencia de ejecución.
- No se encontró `AGENTS.md` en el árbol del repositorio ni en `C:/`, `C:/Proyecto_WA/` o su raíz. No hay instrucciones adicionales de repositorio que aplicar.
- Estado inicial: `git status --short` devolvió únicamente `?? docs/`. Se conservaron el DOCX, su archivo temporal de Word, imágenes, JSON y generador existentes. No se hicieron commits, cambios de rama, resets ni modificaciones a archivos productivos.
- Las verificaciones se hicieron sobre copia temporal de **los archivos seguidos por Git, con sus bytes del árbol de trabajo**, sin copiar secretos locales. Se instaló frontend allí y backend en un venv nuevo. La comparación byte a byte de todos los archivos seguidos con esa copia dio cero diferencias al terminar las verificaciones.
- Solo se añade `docs/P0.1/`: informe, evidencias y una sonda de auditoría. La sonda usa SQLite en memoria y un transporte ML simulado; no contacta despliegues ni envía correos.
- **E** = evidencia de código/configuración inspeccionada; **V** = comportamiento reproducido localmente; **I** = inferencia, no medición; **Q** = pregunta pendiente. Un exit code 0 no implica cobertura funcional.

No se consultaron bases de datos existentes, credenciales, consolas cloud ni datos personales. No se ejecutaron `cleanup_d2r_baseline`, creación de administradores, entrenamiento o el script remoto `test_ml_service.py`.

## 2. Mapa de arquitectura comprobado

| Capa | Implementación y entradas | Dependencias y límites | Evidencia |
|---|---|---|---|
| Frontend | Next.js 16.0.1, React 19.2.0, TypeScript estricto, App Router; `/login`, `/student`, `/student/course/[courseId]`, `/instructor`, `/admin`, `/d2r` y páginas informativas | Tailwind 4, Radix, Recharts; `apiFetch` llama directamente al backend desde el navegador. Next aloja el proxy de frames | `frontend/package.json`, `app/lib/api.ts`, `app/api/attention-proxy/route.ts` |
| Backend | Django 5.2.7, DRF 3.16.1; una app `api`, un módulo central de vistas; rutas `/api/`, `/admin/`, `/accounts/` | SimpleJWT, allauth/dj-rest-auth, PostgreSQL, Google OAuth, Gemini, Mailgun, transcripciones de YouTube; exportación CSV/XLSX/PDF | `backend/core/{settings,urls}.py`, `api/{urls,views,serializers,models}.py` |
| ML en ejecución | FastAPI `/analyze/frame`, `/events`, `/health`, `/debug/status`; OpenCV, MediaPipe FaceMesh con fallback Haar; agregación temporal; ONNX opcional | Importa `onnxruntime` aunque el modelo sea opcional. Buffers en memoria por ID de sesión; no almacenamiento compartido ni limpieza de sesiones identificados | `ml/ml_service.py:14`, `:44`, `:88`, `:291`, `:336`, `:380` |
| Entrenamiento | Exportadores Django → Parquet → `train_model.py` o `train_cnn_lstm.py` → ONNX | Frames y resultados D2R, pandas/pyarrow, PyTorch/torchvision; el segundo entrenador descarga pesos MobileNet. No hay ONNX ni dataset de entrenamiento seguidos por Git | `backend/api/management/commands/export_d2r_*`, `ml/train*.py` |
| Persistencia | PostgreSQL: usuarios, cursos, módulos, lecciones, matrículas, sesiones, eventos, D2R, quizzes, reportes, notificaciones y configuración administrativa | Materiales binarios en `CourseMaterial.file_bytes`, metadatos JSON; perfil en `User.profile_image` (texto). No hay adaptador de object storage identificado | `backend/api/models.py` |
| Almacenamiento local | Compose usa volumen `pg_data`; WhiteNoise/`staticfiles` para estáticos; ML puede escribir JPEG en `FRAMES_DIR/<session_id>` con `SAVE_FRAMES=1` | Frames desactivados por defecto; rutas en JSON del evento. `data/` ignorado por Git. Render/GCP no declaran disco persistente ML en los manifiestos inspeccionados | `docker-compose.yml`, `.gitignore`, `ml/ml_service.py:418`, `render.yaml` |

Flujo académico: matrícula → sesión de curso → vistas de contenidos y captura de cámara → proxy Next → ML → eventos DRF → agregados de sesión → recomendación de dificultad/quizzes → métricas y reportes. La recomendación usa `Session.mean_attention` y `low_attention_ratio`; **no se encontró lectura directa de D2R en `RecommendDifficultyView`** (`views.py:947`). Sí comparte infraestructura ML con D2R.

Flujo D2R: login del estudiante consulta resultados → sin resultados navega a `/d2r` → crea `D2RSession` → widget calcula respuestas por fase mientras se envían JPEG → guarda `D2RResult.phase_data` y totales → panel estudiantil/docente y exportadores consumen esos datos. El código usa **14 fases de 20 s**, no los 15 s del README. Se envían frames cada 500 ms (`page.tsx:14`, `:15`, `:252`).

## 3. Autenticación y fronteras de confianza

1. Credenciales: `LoginForm` → `AuthContext.login` → `POST /api/auth/token/`. `EmailTokenObtainPairSerializer` resuelve correo a username y SimpleJWT emite access/refresh. Valores por defecto: access 60 minutos, refresh 7 días (`core/settings.py`, `serializers.py:226`).
2. Google: `LoginContent` construye URL OAuth y recibe `code` en `/login`; lo envía con `redirect_uri` a `/api/auth/google/`. `GoogleSocialLoginSerializer` intercambia el código mediante allauth; `GoogleLogin` emite JWT; adapters usan email como username. No se observa generación/validación de `state` en este flujo frontend personalizado; debe revisarse su protección completa, sin asumir que la configuración de allauth cubre este recorrido.
3. Solo el **access token** se conserva en `localStorage.jwt_token`. El refresh recibido se descarta; no se encontró renovación automática en `apiFetch`. Logout borra almacenamiento/contexto, sin revocación del JWT. “Mantener sesión iniciada” solo cambia estado visual (`LoginForm.tsx`).
4. `/api/me/` determina navegación por rol. Para student, `/api/d2r-results/` decide onboarding; si esa consulta falla, se navega a `/student`. Las páginas de panel revisadas comprueban presencia del token; la autorización efectiva debe residir en el backend.
5. DRF requiere JWT/IsAuthenticated por defecto, con excepciones como alta pública de usuarios. Los endpoints administrativos emplean `IsAdminUserRole`, que admite rol admin o staff/superuser. Las sondas demuestran que un cliente puede adquirir ese rol mediante interfaces no administrativas: R01.
6. El proxy exige Bearer y consulta `/api/me/`, restringiendo a student. Reenvía el formulario recibido sin vincular `user_id`/ID de sesión con el usuario autenticado. ML no tiene autenticación de entrada en sus handlers. El token de servicio ML se configura aparte; `create_ml_service_user` crea por defecto un **superusuario** y emite solo access, sin renovación automática. Además, el envío actual no adjunta la cabecera preparada: R03.

## 4. Inventario D2R: referencias activas, históricas y ocultas

El [inventario CSV](inventario-d2r.csv) enumera archivo, número de líneas coincidentes y sus posiciones. Búsqueda sobre archivos seguidos: `d2r|baseline|calibrat`, sin distinguir mayúsculas: **31 archivos / 369 líneas**. Es un inventario léxico, no un grafo completo: `baseline-browser-mapping` en package/lock es un **falso positivo ajeno a D2R**. Los otros 29 archivos contienen referencias D2R, incluyendo historia y documentación. Las dependencias sin esos términos están identificadas abajo.

| Grupo | Referencias y uso real | Consecuencia para trabajo posterior |
|---|---|---|
| Ejecución activa | `app/d2r/page.tsx`, `test-widget.tsx`, `d2r-rows.ts`: fases, patrón de estímulos, TA/C/O/TR/CON, cámara y persistencia | Versionar el contrato de resultados antes de cambiar o retirar la prueba |
| Onboarding y navegación | `login/LoginContent.tsx:38`; banner en `student/InicioSection.tsx`; mención en `components/HomePage.tsx` | Eliminar la ruta sin ajustar login y banner rompe recorridos |
| Estudiante | `student/EstadisticasSection.tsx`: `d2r_analysis`, histórico, supuesto percentil, agenda POST `/d2r-schedules/` | Cambiar esquema afecta gráficas, programación y reportes; no se identificó worker que dispare recordatorios por fecha |
| Docente | `EstadisticasProfesorAdvanced.tsx`: consulta resultados, selecciona el último por usuario, correlación con progreso y modal de fases | Dependencia funcional activa: `instructor/page.tsx` monta tanto EstadisticasProfesor como Advanced |
| Filtros heredados activos | Literal `baseline d2r` en `views.py`, serializers administrativos, `student/{CursosSection,InicioSection}` y componentes docentes `{InicioProfesor,MaterialesSection,EstadisticasProfesor,EstadisticasProfesorAdvanced}` | La separación de tablas no eliminó la dependencia de un título de curso. Renombrar ese curso cambia qué datos aparecen; comprobar existencia en BD (Q) |
| Backend activo | `D2RSession`, `D2RAttentionEvent`, `D2RResult`, `D2RSchedule`; serializers y cuatro registros router; `admin.py`; creación de resultado envía Mailgun | CRUD, relaciones CASCADE, agregación de eventos y permisos forman parte del alcance de cualquier separación |
| Métricas compartidas | `_build_student_metrics` y snapshots `StudentReport.payload`; exports PDF/CSV/XLSX; filtros baseline en analytics/admin | Los reportes guardados conservan el esquema D2R incluso si cambia la consulta actual; se necesita política de compatibilidad |
| Migraciones | `0002`, `0003`, `0007`, `0011`, `0012`; `0004` y `0008` dependen de migraciones D2R | `0011` copia sesiones/eventos ligados a resultados y quita la FK antigua; reverse de la migración de datos es noop. No borrar ni reescribir historia sin un plan de datos |
| Mantenimiento | `cleanup_d2r_baseline.py` elimina cursos y datos relacionados; tiene `--dry-run` pero borrar es el modo por defecto | Comando no ejecutado. Requiere reconciliación de datos migrados, copia de respaldo y autorización operativa para una futura limpieza |
| ML activo | `test_name=D2R` por defecto; `d2r_session_id`, `/d2r-attention-events/`, context.phase/spinning/time_left | Sesiones COURSE y D2R comparten clave numérica de buffers y directorios; IDs coincidentes pueden mezclar estado (I basada en código) |
| Dataset | Ambos exportadores unen resultados/fases/eventos; etiquetas F1 + velocidad; windows 16/stride 4; frame_path y mask | No hay etiqueta independiente de observador: el objetivo proviene de la propia prueba. Cambiar fase_data o captura afecta entrenamiento |

Dependencias **sin referencia D2R explícita o fuera del alcance léxico**:

- `app/lib/api.ts` y `app/api/attention-proxy/route.ts`: contrato HTTP, validación de rol, timeouts, errores y variables de URL. Los fallos afectan D2R y cursos.
- `student/course/[courseId]/page.tsx`: cámara, `session_id`, `test_name=COURSE`, y el mismo proxy/servicio. No necesita llamar D2R para quedar afectado por cambios ML.
- `AuthContext`, `/api/me/`, JWT de servicio y su comando de creación: prerrequisitos de captura/persistencia.
- `ml/train_model.py`, `ml/train_cnn_lstm.py` y `ml/requirements.txt`: consumen el dataset de exportadores aunque no mencionen D2R. El backend **no declara pandas ni pyarrow** requeridos por esos comandos.
- `render.yaml`, Compose, Dockerfiles, Cloud Build y variables de entorno: conectividad, token, modelos, rutas y persistencia de frames.
- `StudentReport.payload`, metadatos de eventos y políticas de privacidad: dependencias de esquema/gobierno que no se resuelven renombrando archivos.

## 5. Despliegue y configuración

| Variante | Lo declarado | Divergencias comprobadas o pendientes |
|---|---|---|
| Compose local | PostgreSQL 15; backend runserver 8000, Next dev 3000, ML 9000; bind mounts; `ML_BACKEND_TOKEN` se traduce a `BACKEND_TOKEN` | Exige `backend/.env`, no preparado en quick start; frontend no recibe `ML_SERVICE_URL=http://ml:9000` ni `BACKEND_URL=http://backend:8000`, así que el proxy cae a localhost dentro del contenedor (E/I). `depends_on` no declara health checks. Bind mount frontend puede ocultar node_modules de la imagen |
| Render | Backend pip/Gunicorn, migraciones y collectstatic predeploy, Postgres administrado; ML uvicorn; frontend npm install/build/start | URLs/CORS/HTTPS declarados. No figura BACKEND_TOKEN para ML ni versión Python en YAML. Se desconoce configuración manual efectiva; no equivale a afirmar que el despliegue carece de esas variables |
| GCP | Dockerfiles Python 3.11/node 20; Cloud Build construye/publica tres imágenes; README describe Cloud Run, SQL y Secret Manager | Cloud Build etiqueta `$COMMIT_SHA`, README despliega `latest`; no hay despliegue automático en ese YAML. Frontend construye sin ARG/ENV NEXT_PUBLIC_*; la guía solo los entrega al arrancar. Riesgo de bundle con URLs default (I). Job de migración mostrado no reproduce conexión Cloud SQL/secretos del servicio; comprobar runbook en entorno aislado |

Configuración a acordar por entorno: URLs públicas de frontend/backend; URLs internas del proxy; orígenes CORS/CSRF; SECRET_KEY; DB_* o DATABASE_URL; OAuth ID/secret/callback; JWT de servicio y rotación; Mailgun; GOOGLE_API_KEY; MODEL_PATH/versión; SAVE_FRAMES/FRAMES_DIR y retención. No se incluyen valores secretos en los artefactos.

Almacenamiento cloud real, backups, restauración, región, réplicas, cuotas, retención y proveedor autoritativo siguen como Q. WhiteNoise no sustituye almacenamiento de frames. La existencia de `PrivacyPolicySetting`/`ResearchAccessRequest` no demuestra aplicación técnica: en los lectores/escritores ML inspeccionados no se consulta ese permiso antes de guardar frames o exportarlos.

## 6. Verificaciones ejecutadas y límites

Entorno observado: Windows, Node **22.17.1**, npm **10.9.2**, Python **3.11.9**, Docker cliente/daemon **28.3.2**. Dockerfiles frontend usan Node 20: no se comprobó paridad Linux/Node 20. No se alteraron los paquetes globales ni el node_modules original. El Python global tenía MediaPipe 0.10.14; no se utilizó para afirmar compatibilidad con el 0.10.31 declarado.

| Verificación | Comando/entorno | Resultado y evidencia |
|---|---|---|
| Instalación frontend | `npm ci --no-audit --no-fund`, copia limpia | **V PASS**, 556 paquetes; [salida](npm-ci.txt). No es análisis de vulnerabilidades |
| Lint frontend | `npm.cmd run lint`; JSON con `node node_modules/eslint/bin/eslint.js . --format json --output-file ../lint.json` | **V FAIL**, exit 1; **71 errores y 45 warnings**. [116 diagnósticos](lint-resultados.json) |
| Build frontend | `npm run build` | **V PASS**, exit 0, rutas generadas; warning de baseline-browser-mapping obsoleto. [Salida](build.txt) |
| Tipos frontend | Después del build: `node node_modules/typescript/bin/tsc --noEmit --incremental false` | **V PASS**, exit 0, [sin diagnósticos](types.txt). El build generó tipos Next dentro de la copia |
| Pruebas frontend | Inspección de package.json/archivos | **No configuradas**: no script test ni suite identificada. No hay E2E de cámara/login |
| Instalación backend | Venv Python 3.11 nuevo; `python -m pip install -r backend/requirements.txt` | **V PASS**, exit 0. [Resolución efectiva](backend-dependencias-resueltas.txt), no lock productivo |
| Consistencia paquetes | `python -m pip check` en ese venv | **V PASS**, [salida](backend-pip-check.txt). Al importar aparece RequestsDependencyWarning por dependencias transitivas; pip check no detecta ese problema |
| Django check | `python manage.py check`, copia sin secretos | **V PASS**, 0 issues; [salida](backend-check.txt) |
| Django tests | `python manage.py test --noinput` | Exit 0 pero **0 tests**: no acredita funcionalidad; [salida](backend-tests.txt) |
| Migración/modelos | Sonda: migrate en SQLite `:memory:`; makemigrations check/dry-run | **V PASS**, BD vacía migra; `No changes detected`. No se validó migración de datos históricos ni PostgreSQL |
| Preparación estáticos | `python manage.py collectstatic --noinput`, copia | **V PASS**, 163 archivos; [salida](collectstatic.txt). Imagen/Gunicorn Linux no construidos |
| Configuración de seguridad | `python manage.py check --deploy`, valores default sin secretos | Exit 0 con **5 warnings** W004/W008/W009/W012/W016; [salida](deploy-check.txt). Describe defaults locales, no configuración real cloud |
| Sintaxis Python | `ast.parse` en todos los `.py` seguidos bajo backend y ml | **V PASS**, 41 archivos. No equivale a lint, tipos ni importación ML |
| Lint/tipos Python | Inspección de dependencias/configuración | No hay herramientas ni configuración ruff/flake8/mypy/pyright identificadas. **Documentado, no ejecutado** |
| Compose | `docker compose config --quiet` en copia limpia; repetir tras copiar `.env.example` a `.env` solo allí | **V FAIL** primero por archivo ausente; **V PASS** después. [Sin env](compose.txt), [con ejemplo](compose-example.txt). No arrancó servicios |
| Sondas de contratos/permisos | [probe_baseline.py](probe_baseline.py) sobre copia | Hallazgos reproducidos; [salida](sondas-resultados.txt). No son pruebas de regresión productivas |
| ML instalación/build/integración | Requisitos y scripts inspeccionados | **No ejecutados**. No se prepararon pesos/dataset ni entorno Linux ML; reproducción pendiente abajo. No se asume compatibilidad MediaPipe/ONNX |

La primera invocación de lint con opciones a través de `npm.ps1` perdió argumentos y terminó con exit 2 (“json” interpretado como patrón). Se corrigió la invocación de auditoría usando `npm.cmd` y luego ESLint directamente; **ese error de herramienta no se cuenta como fallo del producto**. Las salidas PowerShell conservan envolturas NativeCommandError cuando hubo stderr; el estado real se registra en esta tabla.

## 7. Hallazgos y riesgos priorizados

Prioridades: **crítica** = barrera para exponer la aplicación; **alta** = integridad, flujo principal o reproducción comprometidos; **media** = deuda operativa/mantenibilidad. Responsables son roles sugeridos, aún no asignaciones personales. Todos los hallazgos quedan abiertos; no se implementaron correcciones.

| ID / prioridad | Hallazgo, evidencia y riesgo | Decisión o trabajo necesario | Responsable sugerido |
|---|---|---|---|
| R01 / Crítica | **V:** alta anónima con `role=admin` devuelve 201; student hace PATCH `/me/` con role admin y obtiene 200. `RegisterSerializer:208`, `UserSerializer:191`, `UserViewSet:509`, `MeView:709`. Permite privilegios administrativos | Definir roles asignables por alta/perfil y quién puede elevarlos; bloquear exposición de esos recorridos hasta corregir y probar | Backend + seguridad + producto |
| R02 / Crítica | **V:** student edita curso ajeno mediante PATCH 200. `CourseViewSet:524` entrega todos los cursos y solo restringe creación. **E/I:** revisar módulos/lecciones/materiales y relaciones escribibles, porque get_queryset y perform_create no constituyen una matriz completa de autorización | Aprobar matriz rol × operación × pertenencia; incluir list/retrieve/create/update/delete y FK cruzadas en pruebas futuras | Backend + QA |
| R03 / Alta | **V:** `post_event_to_backend` prepara `headers` pero `client.post` no los recibe (`ml_service.py:347–349`). **E:** sin token retorna silenciosamente; con token el backend exige JWT y rechazaría la petición (I de integración) | Acordar autenticación máquina a máquina, mínimo privilegio, rotación y evidencia de persistencia extremo a extremo | ML + backend + plataforma |
| R04 / Alta | **E/V parcial:** D2R envía `spinning="false"` a parámetro int; el validador int lo rechaza. Proxy devuelve HTTP 200 con `ok:false` para varios fallos y D2R ignora cuerpo/status (`page.tsx:232`, `route.ts:20–99`). Se puede completar el test sin observar fallo de captura | Definir esquema multipart y semántica de error/estado degradado. Confirmar 422 con FastAPI real y probar UI con ML caído | Frontend + ML + QA |
| R05 / Alta | **E/I:** proxy no vincula IDs a JWT y ML acepta entradas sin auth; `/events` también es público. Token técnico por defecto superusuario; riesgo de suplantación e ingesta no autorizada al reparar R03 | Definir frontera de red y credencial de ingesta; validar pertenencia de sesión y límites de carga antes de habilitar persistencia | Seguridad + backend + ML |
| R06 / Alta | **E:** buffers/directorios ML comparten clave ID entre dos tablas de sesiones; diccionarios sin expiración (`:88–89`, `:397`, `:420`). **I:** contaminación entre sesiones, crecimiento de memoria y resultados distintos al escalar/reiniciar | Identidad compuesta, ciclo de vida y estrategia de concurrencia/replicación; medir después de decidir | ML + plataforma |
| R07 / Alta | **E:** CON (TA−C) se guarda como attention_span, pero `views.py:170` lo transforma en percentil mediante `d2r_avg*100` y UI lo presenta con escalas porcentuales. No hay población normativa en ese cálculo. **I:** interpretación engañosa de métricas | Diccionario de métricas, unidades y significado de baseline/percentil; decidir si conservar/corregir presentación y snapshots | Producto + especialista en medición + ML |
| R08 / Alta | **E/I:** divergencias Compose/GCP/Render descritas en §5; sin manifiesto único de entorno, sin lock transitivo Python/ML y con paquetes ML sin pin | Elegir despliegue de referencia y versiones de runtime; separar dependencias de inferencia/entrenamiento; verificar instalación limpia Linux | Plataforma + líderes backend/ML |
| R09 / Alta | **V:** 71 errores lint; **E/V:** suite backend vacía y frontend sin test runner. Build correcto no detecta R01–R04. No hay pipeline CI de calidad identificado; Cloud Build solo empaqueta imágenes | Acordar baseline de deuda y checks exigidos en próxima fase, sin ocultar fallos ni presentar 0 tests como PASS funcional | QA + frontend + backend |
| R10 / Alta | **E/I:** SAVE_FRAMES guarda JPEG y IDs/rutas; exportadores usan esos datos sin consultar políticas administrativas. Sin disco ML persistente declarado ni política técnica de retención encontrada | Determinar consentimiento, acceso, retención, borrado y localización de datos; decidir dónde guardar/transportar datasets | Responsable de datos + producto + plataforma |
| R11 / Media | **E:** access en localStorage, refresh descartado, checkbox de persistencia sin efecto; flujo OAuth personalizado sin state observable y código parcial registrado en console | Revisar ciclo de sesión y OAuth completo con pruebas; no asumir que CORS o cookies seguras protegen el token guardado en JS | Frontend + backend + seguridad |
| R12 / Media | **E:** exportadores requieren pandas/pyarrow no declarados en backend; `train_model.py` exporta entrada `frames`, inferencia entrega `frames` y `mask`; entrenadores distintos bajo mismo MODEL_PATH. **I:** incompatibilidad de artefacto a reproducir con ONNX real | Especificar contrato y procedencia del modelo, dependencias de exportación y validación del fallback. No afirmar que el modelo opcional funciona por existir el código | ML + backend |
| R13 / Media | **E/I:** agregados por evento usan read-modify-save sin atomicidad; solicitudes concurrentes pueden perder conteos. Captura D2R cada 500 ms sin bloqueo de solicitud en curso; proxy timeout 5 s no se aplica a su llamada previa a `/me/`; ML permite 10 s al backend | Definir presupuesto de latencia, política de concurrencia y métricas; ejecutar carga en staging aislado | Backend + ML + plataforma |
| R14 / Media | **E:** `StudentMetricsView` persiste reportes y export puede crear snapshot; analytics GET crea políticas default. Consultas GET con escrituras y snapshots potencialmente obsoletos | Acordar ciclo de reportes/configuración e idempotencia; revisar consultas anidadas antes de optimizar | Backend + producto |

Deuda adicional: README no refleja 20 s ni endpoints nuevos D2R; documento previo afirma persistencia ML como capacidad, que R03 impide dar por verificada. `ml_service_debug.py` y scripts de diagnóstico constituyen rutas auxiliares, no el servicio configurado en manifiestos. No se ha hecho análisis CVE, pentest exhaustivo ni medición clínica; no se deducen vulnerabilidades de una versión antigua sin verificarlas.

## 8. Archivos de alto acoplamiento

Conteo de líneas sobre el commit auditado; tamaño más responsabilidades e interfaces observadas. No es una métrica formal de complejidad ni fan-in calculado.

| Archivo | Líneas | Razón del acoplamiento / límite de cambio sugerido |
|---|---:|---|
| `backend/api/views.py` | 1636 | Auth, CRUD, permisos, D2R, métricas, exportaciones, IA y notificaciones. Cambios locales comparten modelos/serializers y efectos externos |
| `frontend/app/instructor/components/MaterialesSection.tsx` | 1629 | Jerarquía de curso, CRUD, archivos, estado UI y filtros heredados baseline |
| `frontend/app/student/course/[courseId]/page.tsx` | 1460 | Sesión, contenidos, cámara, ML, quiz y finalización de matrícula; principal punto de regresión compartida |
| `frontend/app/student/EstadisticasSection.tsx` | 870 | Contrato de métricas, D2R, agenda, exportaciones y presentación |
| `frontend/app/instructor/components/EstadisticasProfesorAdvanced.tsx` | 735 | Une matrículas, progreso, resultados, estadísticas y fases D2R |
| `backend/api/serializers.py` | 686 | OAuth personalizado, modelos anidados y relaciones de escritura; define superficie de autorización indirecta |
| `frontend/app/d2r/page.tsx` | 540 | Timing, puntuación, cámara, protocolo ML y persistencia del resultado |
| `ml/ml_service.py` | 499 | Inicializa detectores/modelo y entrenamiento, mantiene estado, calcula score y hace transporte backend |

Acoplamiento transversal: `api/models.py`, `api/urls.py`, `AuthContext.tsx`, `lib/api.ts` y proxy. No se propone refactorizar en P0.1: primero contratos, pruebas y decisiones.

## 9. Reproducción y trabajo pendiente

Ejecutar en una copia descartable. No usar `.env` de producción. Los comandos siguientes documentan instalación/checks; no autorizan desplegar ni borrar datos.

```powershell
# Desde copia de repositorio, PowerShell; Python 3.11 y Node disponibles
python -m venv .venv-audit-backend
.\.venv-audit-backend\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv-audit-backend\Scripts\python.exe -m pip check
.\.venv-audit-backend\Scripts\python.exe docs/P0.1/probe_baseline.py .
Push-Location backend
..\.venv-audit-backend\Scripts\python.exe manage.py check
..\.venv-audit-backend\Scripts\python.exe manage.py test --noinput
..\.venv-audit-backend\Scripts\python.exe manage.py collectstatic --noinput
Pop-Location
Push-Location frontend
npm.cmd ci --no-audit --no-fund
npm.cmd run lint
npm.cmd run build
node node_modules/typescript/bin/tsc --noEmit --incremental false
Pop-Location
Copy-Item backend/.env.example backend/.env
docker compose config --quiet
```

Para repetir la instalación ML, pendiente, en una copia y venv **separado** Python 3.11: `python -m pip install -r ml/requirements.txt`, `python -m pip check`; registrar freeze y fallos del resolver/importación. Para paridad productiva ejecutar allí `docker build -f ml/Dockerfile.gcp -t visionclass-ml:p01 ./ml` y análogamente backend/frontend. Antes de cualquier arranque ML fijar `TRAIN_ON_START=0`, `SAVE_FRAMES=0`, `BACKEND_TOKEN` vacío y backend sintético/local; probar health y frames sintéticos con ambas clases de sesión. No usar el script remoto existente: tiene URL Render e IDs fijos, realiza POST y sobrescribe una imagen seguida por Git.

Pendientes con resultado objetivo y dueño:

| Pendiente | Cómo resolver / evidencia exigida | Dueño sugerido |
|---|---|---|
| PostgreSQL y legado D2R | BD nueva aislada PostgreSQL 15 + copia anonimizada de versión anterior; conteos antes/después de 0011, integridad FK, muestras de phase_data, plan de rollback. No basta SQLite vacío | Backend + datos |
| Instalación e inferencia ML real | Imagen Linux limpia, resolver/imports, FaceMesh/fallback, contrato 422, persistencia evento, modelos ONNX con inputs documentados | ML + QA |
| Despliegue de referencia | Elegir Compose/staging Render/GCP; manifestar URLs de build/runtime, red, secretos por nombre, health checks y digest de imagen | Plataforma |
| Sesión/OAuth | Usuarios sintéticos de tres roles, expiración, refresh/logout, callback/state, negativos por rol/propiedad. Capturas/logs sin tokens | Seguridad + QA |
| Cámara y curso completo | Navegador con/sin permiso, ML caído/lento, fin D2R/curso y cancelación; comparar eventos realmente persistidos con UI | Frontend + QA |
| Volumen y operación | Conteos/crecimiento de eventos/frames, número de alumnos concurrentes, latencias y memoria; backups/restauración verificables | Plataforma + datos |

## 10. Decisiones necesarias y aprobación objetiva

| Decisión | Pregunta abierta | Responsable de decidir |
|---|---|---|
| D01 Alcance D2R | ¿Se conserva, se separa o se sustituye? ¿Es onboarding obligatorio? ¿Qué significa baseline y qué histórico debe permanecer legible? | Producto + especialista en medición |
| D02 Permisos | ¿Quién crea roles y qué puede hacer cada rol sobre recursos ajenos, incluidas sesiones y resultados? | Producto + seguridad + backend |
| D03 Contratos | ¿Unidades de cada métrica, campos de fase, identidad de sesión y criterio de éxito de ingesta? ¿Cómo ve el usuario un fallo ML? | Frontend + backend + ML |
| D04 Operación | ¿Proveedor/runtime de referencia, red ML, propietario de credenciales, presupuesto de latencia y retención? | Plataforma + datos |
| D05 Calidad | ¿Qué deuda se acepta temporalmente, quién corrige cada hallazgo y en qué hito? | Líder técnico + QA |

### Adenda de decisiones G0 — 2026-09-14

El formulario saneado [DECISIONES_G0_SANITIZADAS.json](../G0/DECISIONES_G0_SANITIZADAS.json) resuelve la asignación operativa de D01–D05 y R01–R14. La tarea propia de cancelación visual sustituirá gradualmente D2R; el histórico quedará en solo lectura y PR41 hará el retiro final. Se fijan permisos de mínimo privilegio, contrato de métricas, éxito de ingesta, identidad ML y tratamiento por riesgo. `tesista_operador` es propietario técnico único. La revisión P0.1 es **APROBAR CON CORRECCIONES**: lint, pruebas, dependencias y controles de seguridad siguen abiertos y no autorizan exposición.

**Criterios de aprobación de esta tarea de análisis (P0.1):**

- [x] Commit, entorno, estado inicial y alcance conservado registrados; ningún archivo productivo cambiado.
- [x] Frontend, backend, ML, datos, despliegue y auth vinculados a archivos reales.
- [x] Inventario D2R con posiciones, separación de referencias activas/históricas/falsos positivos y dependencias no léxicas.
- [x] Cada categoría solicitada (instalación, lint, tipos, pruebas, build) tiene resultado ejecutado o procedimiento/límite documentado; evidencia distingue 0 tests de cobertura.
- [x] Hallazgos priorizados con evidencia/inferencia, impacto, acción y responsable sugerido; sondas reproducibles sin servicios reales.
- [ ] Líder técnico y QA revisan informe/evidencias contra el commit y aceptan expresamente los pendientes de §9 como alcance posterior, o piden ejecutarlos antes del cierre.
- [x] El formulario G0 asigna D01–D05 y R01–R14 a `tesista_operador`, con PR/hito y condición de no exposición. La aceptación independiente y la eficacia de los controles siguen pendientes.

**Estado actualizado:** P0.1 revisado por el tesista como **APROBAR CON CORRECCIONES**; aprobación independiente pendiente. Aceptar esta auditoría no acepta los fallos para un release. Antes de exponer una nueva versión deben resolverse R01/R02, verificarse los contratos R03–R05 y completarse pruebas de autorización, persistencia y despliegue sobre el entorno elegido. Estas correcciones pertenecen a tareas posteriores.
