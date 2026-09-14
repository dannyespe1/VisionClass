# PR02 — Desacoplar D2R del flujo principal

- **Estado:** IMPLEMENTADO LOCALMENTE — NO DESPLEGADO
- **Fecha:** 2026-09-14
- **Base de integración:** Ola 1 `82f80da95b11bd204d4d650b94ff44e0fab9cde8`
- **Fuente adelantada:** `8ae22574f6c346edb268033a2b42a49521476c6b`, reconciliada con PR03 y PR07.
- **Gate:** G0 continúa `BLOQUEADA`; este cambio no autoriza participantes, exposición, piloto ni datos reales.
- **Propietarios sugeridos:** frontend y backend; revisión de seguridad para el control de escritura.

## Resultado comprobado

- El login resuelve primero el rol. Con el valor predeterminado del flag, un estudiante entra en `/student` sin consultar resultados D2R.
- Docentes y administradores conservan sus destinos `/instructor` y `/admin`, independientes de D2R.
- La navegación principal oculta el recordatorio, programación, pestaña y resultados D2R cuando el flag está apagado.
- La ruta `/d2r` redirige a `/student` antes de crear una sesión, pedir cámara o enviar frames cuando el flag está apagado.
- Django conserva `GET`, `HEAD` y `OPTIONS` sobre los recursos D2R históricos. Rechaza `POST`, `PUT`, `PATCH` y `DELETE` cuando `D2R_ENABLED=False`.
- El panel administrativo conserva lectura histórica y bloquea altas, cambios y eliminaciones D2R cuando el flag está apagado.
- Las métricas del estudiante mantienen el contrato `d2r_analysis`, con valores vacíos cuando D2R está apagado, sin consultar resultados ni programaciones D2R.
- No se eliminaron rutas, modelos, migraciones, exportadores, datos históricos ni integración ML. Su archivo definitivo continúa reservado para PR41.

## Configuración y rollback

| Servicio | Flag | Valor seguro | Efecto |
| --- | --- | --- | --- |
| Next.js | `NEXT_PUBLIC_D2R_ENABLED` | `false` o ausente | Omite consultas y accesos D2R; bloquea la ruta histórica. |
| Django | `D2R_ENABLED` | `False` o ausente | Mantiene lectura histórica y bloquea escritura D2R. |

Rollback temporal: configurar `D2R_ENABLED=True`, recompilar el frontend con `NEXT_PUBLIC_D2R_ENABLED=true` y ejecutar las pruebas PR02. Los dos valores deben coincidir. El rollback no restaura datos porque este PR no los modifica ni elimina.

## Evidencia, inferencias y preguntas abiertas

### Evidencia comprobada

- P0.1 inventarió referencias D2R en frontend, backend, ML, migraciones y comandos.
- El acoplamiento obligatorio estaba en `frontend/app/login/LoginContent.tsx`: consultaba `/api/d2r-results/` y redirigía a `/d2r` cuando la lista estaba vacía.
- Las rutas y modelos legados siguen versionados y sus lecturas siguen autorizadas según el rol actual.
- Las pruebas automatizadas cubren estudiante, docente y administrador en el enrutamiento; además cubren lectura histórica, bloqueo de escritura, métricas vacías y reactivación del flag en Django.
- No existe un framework E2E versionado. La navegación integrada con navegador y servicios levantados no se ejecutó; se comprobó mediante lógica unitaria, verificación estática, tipos y build.

### Inferencias

- La entrada a curso continúa independiente porque `frontend/app/student/page.tsx` navega directamente a `/student/course/{courseId}` y no consulta D2R.
- Los consumidores externos no documentados de endpoints D2R podrán seguir leyendo, pero sus escrituras recibirán HTTP 403 con el flag apagado.

### Preguntas abiertas

- `PLAN_TRABAJO.csv` sitúa PR02 después de PR07, mientras `PLAN_PR_DETALLADO.json` declara únicamente PR01 y P0.1 como dependencias. La ejecución fue autorizada expresamente desde PR01; cualquier integración debe reconciliar esta discrepancia.
- PR03 debe revisar la propiedad y autorización histórica de docentes y administradores. PR02 conserva esas reglas y no las amplía.
- PR07 debe definir consentimiento y alternativa funcional antes de habilitar cualquier captura.
- La retirada de código, esquema, exportadores y servicio ML D2R continúa diferida hasta PR41.

## Riesgos residuales priorizados

| Prioridad | Riesgo | Control actual | Decisión pendiente |
| --- | --- | --- | --- |
| Alta | Flags frontend/backend divergentes | Valores seguros apagados y procedimiento conjunto | Automatizar comprobación de paridad en despliegue futuro. |
| Alta | Habilitación antes de G0/PR07 | G0 documentada como bloqueada; default apagado | Requerir aprobación y consentimiento antes de cambiar valores. |
| Media | Consumidor externo intenta escribir D2R | API responde 403 sin borrar rutas | Inventariar consumidores externos antes de PR41. |
| Media | Código legado acumula vulnerabilidades | Aislado, conservado y cubierto por flag | Mantener solo hasta demostrar independencia en PR41. |
| Media | Dependencia declarada de PR07 es inconsistente | Registrada como pregunta abierta | Resolver el grafo antes de integrar la secuencia completa. |
| Media | Falta recorrido E2E automatizado | Unitarias, estática, API y build pasan | Incorporar el recorrido cuando exista infraestructura E2E aprobada. |

## Criterios objetivos de aceptación

- [x] Login de estudiante funciona sin consulta ni resultado D2R cuando el flag está apagado.
- [x] Docente y administrador mantienen su enrutamiento independiente.
- [x] Entrada a cursos permanece directa desde el panel de estudiante.
- [x] Navegación principal no ofrece acciones D2R con el flag apagado.
- [x] Ruta D2R no crea sesión, solicita cámara ni envía frames con el flag apagado.
- [x] Datos y rutas legados conservan lectura autorizada.
- [x] Escrituras API y administración quedan bloqueadas con el flag apagado.
- [x] El flag permite restaurar el comportamiento legado sin recuperar código eliminado.
- [x] No hay migraciones ni eliminación de datos.
- [x] Compatibilidad técnica con PR03 y PR07 verificada en la rama de Ola 2.
- [ ] Revisión independiente e integración autorizada.

## Referencias

- [Arquitectura candidata PR01](../PR01/ADR-0001-ARQUITECTURA-OBJETIVO.md)
- [Inventario D2R de P0.1](../P0.1/inventario-d2r.csv)
- [Catálogo de PR](../P0.5/CATALOGO_PR.md)
- [Dependencias actualizadas de PR02](DEPENDENCIAS_D2R.csv)
- [Verificación](VERIFICACION.json)
