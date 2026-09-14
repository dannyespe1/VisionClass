# P0.5 — Preparación del repositorio para ejecución con Codex

**Fecha de corte:** 2026-09-14
**Repositorio:** `dannyespe1/VisionClass`
**Rama de trabajo:** `p05-preparacion-codex`
**Base observada:** `main` en `7f8f9cb` y sin divergencia con `origin/main` al iniciar
**Resultado:** preparación local y catálogo PR01–PR41 completados; P0.5 **NO APROBADO** hasta versionar, revisar y verificar las acciones externas.

## Alcance y método

Se leyeron `AGENTS.md`, README, documentación P0.1–P0.4, manifiestos, configuración de Django, Docker, Render y Cloud Build, rutas de integración y estado/historial de Git. Se conservaron los artefactos P0 existentes que ya estaban sin seguimiento. No se cambió comportamiento productivo, contratos, esquemas ni dependencias.

Este informe usa tres categorías:

- **Comprobado:** observado en archivos, comandos o historial local.
- **Inferencia:** propuesta razonable sin fuente suficiente para declararla definitiva.
- **Pregunta abierta:** decisión o evidencia que debe aportar una persona responsable.

## Resultado versionable

| Artefacto | Resultado | Estado |
| --- | --- | --- |
| `AGENTS.md` | Arquitectura, comandos canónicos, restricciones, coordinación y reglas de gobernanza | Preparado localmente |
| `.github/CODEOWNERS` | Propiedad provisional para todo el árbol | Preparado; falta segundo revisor |
| `.github/pull_request_template.md` | Evidencia, dependencias, tipo, seguridad, privacidad, ciencia y rollback | Preparado localmente |
| `.github/ISSUE_TEMPLATE/` | Formularios separados para `code`, `operations`, `approval` y `epic` | Preparado localmente |
| `EPICAS.md` | Ocho cuerpos de épica listos para publicar con su secuencia y tipos | Preparado; no publicado |
| `.github/workflows/required-checks.yml` | Cinco checks candidatos a obligatorios y lint informativo | Preparado; sin ejecución remota |
| `BRANCH_PROTECTION.json` | Política exacta y orden de activación | Propuesta `applied=false`; remoto desconocido |
| `PLAN_TRABAJO.csv` | 5 preparaciones, 7 gates y 41 PR con dependencia, tipo, título y propietario sugerido | Inventario completo; 41 alcances importados |
| `PLAN_PR_DETALLADO.json` y `CATALOGO_PR.md` | Objetivo, dependencias, cambios, pruebas, terminado, riesgo y rollback para PR01–PR41 | 41 PR únicos; fuente identificada por SHA-256; pendiente de aprobación |
| `GRAFO_DEPENDENCIAS.md` | Secuencia de `AGENTS.md` y dependencias explícitas del plan fuente | Preparado localmente y comprobado topológicamente |
| `COLISIONES_WORKTREES.csv` | Archivos y recursos compartidos que deben serializarse | Preparado localmente |
| `scripts/verify_governance.py` | Valida estructura, inventario, tipos y referencias | Preparado localmente |

## Arquitectura comprobada

| Componente | Evidencia | Frontera y acoplamiento |
| --- | --- | --- |
| Frontend | Next.js 16, React 19 y TypeScript en `frontend/package.json` | JWT, proxy, UI D2R y cursos; comparte contratos sin esquema generado |
| Backend | Django 5.2.7, DRF y SimpleJWT en `backend/requirements.txt` y `backend/core/settings.py` | Única autoridad prevista para identidad y autorización; `backend/api/views.py` concentra endpoints |
| ML | FastAPI, MediaPipe y OpenCV en `ml/requirements.txt` y `ml/ml_service.py` | Servicio separado que recibe señales y usa token de servicio; frontera de alto riesgo |
| Datos | PostgreSQL en Django y Compose; archivos/exportaciones/checkpoints en comandos y rutas ML | Base y artefactos locales se comparten si los worktrees reutilizan recursos |
| Despliegue | Compose, Render y Cloud Build | Tres superficies de configuración sin una validación CI previa a P0.5 |

El flujo principal observado es navegador → frontend/proxy → backend → PostgreSQL, con navegador → servicio ML y servicio ML → backend en el flujo D2R. La descripción completa de datos y confianza permanece en P0.2.

## Comandos y checks

Los comandos canónicos quedaron fijados en `AGENTS.md`. La propuesta de CI usa Node 20, Python 3.11 y PostgreSQL 15:

| Contexto | Ejecución | Candidato obligatorio |
| --- | --- | --- |
| `governance` | Valida los artefactos P0.5 | Sí |
| `frontend-types` | `npm ci` y `npm run typecheck` sin emisión | Sí |
| `frontend-build` | `npm ci` y build Next.js | Sí |
| `backend-checks` | instalación, Django check, deriva de migraciones y pruebas | Sí |
| `ml-static` | compilación sintáctica de Python sin entrenar ni cargar modelos | Sí |
| `frontend-lint-informational` | lint real, con fallo visible y tolerado por el workflow | No por ahora |

P0.1 comprobó localmente instalación frontend, tipos y build; el lint registró 71 errores y 45 advertencias. Django `check` pasó y la suite descubrió cero pruebas. Esos resultados son línea base, no evidencia de este workflow en GitHub. Hacer obligatorio el lint hoy bloquearía todos los PR; ocultarlo daría una señal falsa. Debe corregirse en un PR acotado o aceptarse una excepción fechada antes de G0.

## Protección de `main`

`BRANCH_PROTECTION.json` exige rama actualizada, cinco checks, revisión de CODEOWNERS, una aprobación, aprobación del último push por otra persona, resolución de conversaciones, historial lineal, aplicación a administradores y prohibición de force-push y borrado.

**Comprobado:** no existía `.github/`, no está instalado GitHub CLI y no hay una credencial administrativa disponible en el entorno. GitHub requiere permisos `Administration: write` para aplicar protección mediante la API. Esta propuesta permanece intencionalmente con `applied=false`; el estado remoto actual es `unknown`, no se infiere que la rama carezca de otras reglas. La referencia del endpoint se contrastó con la [documentación oficial de protección de ramas](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28).

**Acción operativa pendiente:** después de integrar el workflow, un administrador debe ejecutar los checks al menos una vez, verificar sus contextos, aplicar el payload por API o interfaz, leer la configuración resultante y adjuntar evidencia. Un PR de prueba debe demostrar que autor, administrador y automatizaciones no pueden omitir las reglas configuradas.

## Issues y épicas

`PLAN_TRABAJO.csv` contiene 53 unidades: 5 de tipo `operations`, 7 de tipo `approval` y 41 de tipo `code`. `EPICAS.md` las organiza en ocho cuerpos publicables: preparación P0, seis tramos terminados por G1–G6 y cierre posterior a G6. Los formularios obligan a separar el cambio de código, la acción sobre infraestructura o datos y la decisión aprobatoria.

**Comprobado:** se recibió `Plan_Mejorado_Ejecucion_VisionClass_Prompts_Codex.docx`, cuya huella es `4352015df2a874707cf725564f1e1d56cbe974fb838b414357f50f9786186134`. Su extracción textual tiene huella `9be008f0a32dbe344fe9596f4ed8ced1b11cef5f62a2001347f3c69c3cb05f58`. El DOCX y la extracción contienen los mismos 41 encabezados PR, exactamente una vez.

El contenido se transfirió a `PLAN_PR_DETALLADO.json` y `CATALOGO_PR.md`. Los 41 registros tienen objetivo, dependencias literales y normalizadas, cambios esperados, pruebas mínimas, definición de terminado, riesgo y rollback. `PLAN_TRABAJO.csv` conserva el orden de ejecución aprobado en `AGENTS.md`; el verificador prueba que cada dependencia normalizada aparece antes que su PR. Los roles de propietario son sugeridos, no asignaciones aceptadas.

**No ejecutado:** no se crearon issues remotos porque el entorno no dispone de GitHub CLI ni autorización de escritura, y esta tarea excluye cambios remotos. Los cuerpos ya son publicables después de revisión humana.

## Colisiones entre worktrees

El historial completo identifica como puntos de mayor edición `frontend/app/student/course/[courseId]/page.tsx` (23 cambios), `ml/ml_service.py` (12), `backend/api/views.py` (11), `frontend/app/instructor/components/MaterialesSection.tsx` (10), `frontend/app/student/CursosSection.tsx` (10) y `frontend/app/ui/chart.tsx` (10). El inventario agrega riesgo semántico aunque el historial sea menor: modelos/migraciones, cliente API, autenticación, lockfiles, CI, despliegue y reglas globales.

Los worktrees también colisionan fuera de Git: Compose publica 3000/8000/9000/5432, el volumen `pg_data` depende del nombre de proyecto y los `.env`, datasets, exportaciones y checkpoints no deben compartirse. La regla establecida es un propietario activo por grupo `serializar`, reserva en el issue, `COMPOSE_PROJECT_NAME` y puertos únicos, y datos/secretos propios de cada worktree.

## Hallazgos y riesgos priorizados

| Prioridad | Hallazgo | Impacto | Corrección mínima | Responsable sugerido |
| --- | --- | --- | --- | --- |
| P0 | Política propuesta para `main` no aplicada y estado remoto desconocido | No existe evidencia de que revisión y checks sean obligatorios | Leer estado remoto completar activación y ejecutar prueba negativa | Administrador del repositorio |
| P0 | Solo se conoce `@dannyespe1` como CODEOWNER | La aprobación independiente puede bloquearse o quedar sin dueño | Añadir segunda cuenta o equipos por dominio | Propietario del repositorio |
| P0 | P0.1–P0.4 y P0.5 siguen sin seguimiento en Git | La evidencia puede perderse y no es revisable por commit | Revisar y versionar cada unidad sin mezclar alcances | Tech lead |
| P1 | Workflow nuevo sin corrida remota | Nombres de contexto y comportamiento no comprobados | Ejecutar en PR y guardar enlaces a las cinco corridas | CI owner |
| P1 | Lint falla y no puede exigirse todavía | Deuda creciente o bloqueo total si se activa | PR de saneamiento o excepción con fecha y presupuesto cero de regresión | Frontend owner |
| P1 | Suite backend descubre cero pruebas | Un check verde no detecta regresiones | Añadir pruebas significativas en PR de línea base autorizado | Backend owner |
| P1 | Archivos monolíticos y contratos no formalizados | Conflictos y cambios incompatibles entre worktrees | Serializar y definir contratos antes de paralelizar | Tech lead |
| P1 | Compose y Django contienen contraseña local por defecto | Copia accidental a entornos reales y falsa práctica segura | Mover a ejemplo local no secreto en PR de seguridad | Security owner |
| P2 | Propietarios son roles sugeridos sin cuentas ni suplencias | Gates sin responsable efectivo | Matriz RACI con cuentas y fechas | Tesista + sponsor |

## Decisiones necesarias

| ID | Decisión | Opciones mínimas | Propietario sugerido | Fecha objetivo |
| --- | --- | --- | --- | --- |
| D-P05-01 | Segundo revisor independiente y CODEOWNERS por dominio | Cuenta individual o equipos GitHub | Repository owner | Antes de proteger `main` |
| D-P05-02 | Ratificación del catálogo PR01–PR41 importado | Aprobar el contenido por SHA o registrar correcciones versionadas | Tech lead + autor del plan | Antes de G0 |
| D-P05-03 | Tratamiento del lint base | Corregir y exigir; o excepción fechada con deuda cero adicional | Frontend owner | Antes de G0 |
| D-P05-04 | Política de merge compatible con historial lineal | Squash o rebase | Repository owner | Al activar protección |
| D-P05-05 | Identidades responsables de gates | Personas y suplencias para investigación privacidad seguridad y piloto | Sponsor del estudio | Antes de G0 |
| D-P05-06 | Aislamiento operativo de worktrees | Puertos y Compose únicos o un stack serial | DevOps owner | Antes del primer PR paralelo |

### Adenda de decisiones G0 — 2026-09-14

El formulario saneado [DECISIONES_G0_SANITIZADAS.json](../G0/DECISIONES_G0_SANITIZADAS.json) adopta squash merge, un único stack serial, corrección completa del lint y pruebas backend/frontend antes de reconsiderar G0. Autoriza preparar las 53 unidades y revisar sus metadatos, pero no publicarlas remotamente en esta tarea. `tesista_operador` queda como administrador y ejecutor técnico; continúa pendiente un segundo revisor independiente. La protección de `main` conserva `applied=false` y estado remoto desconocido.

## Preguntas abiertas

1. ¿Qué segunda cuenta o equipos pueden revisar de forma independiente?
2. ¿El plan de GitHub del repositorio permite todas las reglas y checks propuestos?
3. ¿Quién acepta y fecha cualquier excepción temporal de lint o pruebas?
4. ¿Qué cuentas concretas asumirán los roles sugeridos y sus suplencias?

## Criterios objetivos de aprobación de P0.5

P0.5 puede proponerse a G0 solo cuando exista evidencia de todos los puntos siguientes:

1. Todos los artefactos de este informe están revisados y versionados en un commit identificable; `python scripts/verify_governance.py` pasa en local y CI.
2. PR01–PR41 tienen objetivo, criterios de aceptación, riesgos, rollback, propietario y dependencia; ninguna fila conserva `detailed_scope=false`. **Cumplido localmente; falta revisión sobre commit.**
3. Las 53 unidades están publicadas o enlazadas como issues/épicas y conservan tipo `code`, `operations` o `approval` sin mezclar decisiones con implementación.
4. CODEOWNERS contiene al menos dos revisores efectivos o equipos por dominio, y una prueba confirma revisión independiente.
5. Los cinco checks obligatorios pasan sobre el mismo SHA en GitHub. El lint pasa y se exige, o existe una excepción aprobada con responsable, fecha de vencimiento y prohibición de aumentar errores.
6. La lectura remota de protección de `main` coincide con `BRANCH_PROTECTION.json`, que se actualiza a `applied=true` con fecha y enlace a evidencia.
7. Un PR de prueba no puede integrarse con checks fallidos, conversación abierta, revisión obsoleta, último push sin aprobación o intento de bypass administrativo.
8. Cada issue que toque un grupo `serializar` declara reserva y los worktrees de integración usan recursos locales aislados.
9. Los bloqueos P0 de P0.1–P0.4 están cerrados o constan como dependencias rechazadas; G0 tiene un acta separada con decisión y aprobadores.

## Verificación ejecutada en P0.5

El detalle estructurado está en `VERIFICACION.json`.

- `python scripts/import_execution_plan.py <extracción> <DOCX>`: **PASS**; importó 41 PR y verificó su orden topológico.
- Comparación de encabezados DOCX/extracción: **PASS**, 41 contra 41 y coincidencia exacta.
- `python scripts/verify_governance.py`: **PASS** con el runtime Python de Codex después de actualizar hashes.
- `npm --prefix frontend run typecheck`: **PASS**.
- `python -m compileall -q scripts ml`: **PASS**; no cargó modelos ni datos.
- `docker compose config --quiet`: **PASS**, con advertencia local de acceso al archivo de configuración del cliente Docker.
- `npm --prefix frontend run lint`: **FAIL**, 71 errores y 45 advertencias ya registrados en P0.1.
- `npm --prefix frontend run build`: **PASS** en la repetición con red; `baseline-browser-mapping` emitió una advertencia de datos desactualizados.
- Backend aislado: instalación, `check` y deriva de migraciones **PASS**; `test api --noinput` terminó con código cero y descubrió **0 pruebas**.
- Sintaxis YAML: **PASS**, seis YAML, seis jobs y cuatro formularios. GitHub Actions remoto: **NO EJECUTADO** porque el workflow aún no está publicado.

Hasta entonces, la preparación sirve como propuesta reproducible y auditable, pero no como evidencia de que el repositorio remoto esté listo para ejecución autónoma.
