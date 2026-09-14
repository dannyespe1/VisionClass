# Acta de revisión de la Puerta G0

**Fecha de evaluación inicial:** 2026-09-12
**Revisión técnica:** 2026-09-14
**Rama:** `p05-preparacion-codex`
**Base evaluada:** `7f8f9cb987779b6e4df417b3195040a7b4b7dc60`
**Veredicto:** **BLOQUEADA**

## Fundamento de la decisión

Las diez categorías solicitadas tienen artefactos locales. El formulario G0 fue importado de forma saneada con trazabilidad por SHA-256 y registra revisión del tesista como **APROBAR CON CORRECCIONES** para P0.1–P0.5. La puerta no puede aprobarse porque faltan revisores independientes, ratificaciones institucionales, evidencia de eficacia y remediación técnica. La existencia documental y la asignación de ejecutor demuestran preparación; no demuestran aceptación independiente ni eficacia de controles.

Este veredicto evalúa la preparación para comenzar la secuencia posterior a G0. No exige corregir en esta puerta todas las vulnerabilidades del producto: sí exige que los hallazgos estén aceptados, tengan propietario y estén asignados a trabajo posterior con dependencia verificable. El plan local ya aporta trazabilidad técnica para 41 PR; todavía faltan ratificación, responsables nominales e issues versionados o remotos.

## Matriz de evidencia

| Requisito | Evidencia comprobada | Evaluación G0 |
| --- | --- | --- |
| Línea base del repositorio | P0.1 mapea componentes, D2R, auth, despliegue, pruebas y archivos acoplados; formulario asigna R01–R14 | **Revisada con correcciones:** lint 71/45, cero pruebas backend, ML no instalado y revisión independiente pendiente |
| Mapa de arquitectura | P0.1 y `AGENTS.md` describen frontend, backend, ML, PostgreSQL, despliegue, auth y contratos | **Presente:** deuda de contratos formales, pero no bloquea por ausencia |
| Inventario de datos | P0.2 clasifica D01–D16; formulario fija custodio operativo, usos, accesos y plazos técnicos | **Revisado con correcciones:** institución, privacidad/ética, proveedor y plazo formal de consentimiento siguen sin ratificación |
| Modelo de amenazas | P0.2 documenta TB1–TB7, F01–F13 y T01–T15; formulario asigna ejecutor y condiciones de no exposición | **Presente, pendiente de aceptación independiente:** tratamientos aún no implementados ni probados |
| Definición del constructo | P0.3 separa desempeño, autoinforme, orientación, señal visual y `no_observable`; adopta tarea propia | **Candidato pendiente de ratificación independiente** |
| Protocolo de evaluación | P0.3 define participante como unidad, anotación, muestra, faltantes, split y análisis | **No aprobado:** D01, D03, D05 y D08 pendientes; umbral M1 sigue abierto; sin sello externo |
| Umbrales iniciales | P0.4 fija SLO, cola, recursos, calibración, cobertura, validez, equidad y suspensión | **Presentes, no validados:** 7 gates `BLOCKED`, 2 `NOT_STARTED`; capacidad efectiva declarada cero |
| Instalación, pruebas y build | P0.1 conserva comandos/salidas y P0.5 los canoniza en `AGENTS.md` y CI | **Presentes con fallos:** lint rojo, 0 tests backend, ML no instalado, workflow remoto no ejecutado |
| `AGENTS.md` | Incluye arquitectura, comandos, orden, restricciones y coordinación de worktrees | **Presente en el árbol candidato:** su estado versionado se comprueba con Git |
| Dependencias actualizadas | P0.5 registra 41 alcances, grafo/orden y hashes del plan fuente; G0 añadió auditorías npm/pip | **Plan presente; dependencias técnicas bloqueantes:** frontend tiene 17 paquetes vulnerables y 48 desactualizados; backend 109 registros en 9 paquetes; ML no resuelve la auditoría y mantiene 10 requisitos sin pin |

La matriz procesable se conserva en [MATRIZ_G0.csv](MATRIZ_G0.csv) y los conteos en [VERIFICACION.json](VERIFICACION.json).

## Bloqueos determinantes

1. **Revisión independiente ausente.** El tesista revisó P0.1–P0.5 con correcciones y asumió ejecución, pero no puede autoaprobar G0, ética, privacidad, metodología, validez, equidad o piloto.
2. **Protocolo confirmatorio incompleto.** P0.3 mantiene pendientes la ratificación de sede, simulación de SESOI/muestra, segundo anotador y sello/aprobador del preregistro.
3. **Privacidad y gobierno sin ratificación institucional.** Hay custodio operativo y decisiones técnicas, pero entidad responsable, canal formal, instancia ética, privacidad, proveedor/región y plazo de consentimiento siguen abiertos.
4. **Umbrales sin evidencia operativa.** P0.4 define gates conservadores, pero carga, SLI, backpressure, fallback, rollback y restore no se probaron. Esto impide interpretarlos como capacidad disponible.
5. **Plan ejecutable sin publicación ni revisión independiente.** P0.5 contiene 41 PR únicos y 53 unidades preparadas, pero no existen issues remotos enlazados y falta segundo revisor.
6. **Gobernanza remota desconocida.** El workflow no se ejecutó en GitHub y la protección propuesta de `main` permanece `applied=false`, con estado remoto `unknown`.
7. **Dependencias vulnerables y no reproducibles.** La consulta de 2026-09-13 encontró 1 paquete crítico y 11 altos en frontend, además de 109 registros de vulnerabilidad backend. La auditoría ML no resolvió `torch==2.1.0` bajo Python 3.12 y el manifiesto tiene 10 requisitos sin versión. El detalle está en [DEPENDENCIAS_G0.md](DEPENDENCIAS_G0.md).

Los fallos críticos de autorización, transmisión de frames y controles de consentimiento descubiertos en P0.1/P0.2 deben permanecer como condiciones de no exposición y asignarse a PR concretos. Se consideran bloqueo para despliegue o captura, aunque su corrección productiva corresponde a la secuencia posterior a G0.

## Condiciones objetivas para reconsiderar G0

G0 podrá volver a revisión cuando, sobre un mismo commit:

1. P0.1–P0.5 y esta acta estén versionados, sus hashes pasen y cada informe tenga revisión independiente registrada.
2. P0.1 complete los tratamientos asignados para R01–R14; no se presente cero pruebas como cobertura.
3. P0.2 ratifique institución, privacidad/ética, proveedor, retención formal y límites de captura.
4. P0.3 ratifique D01, D03, D05 y D08, cierre el umbral M1 antes de G3 y obtenga firma/sello anteriores a outcomes o scores.
5. P0.4 mantenga los umbrales como criterios iniciales y asigne propietarios; la falta de pruebas operativas queda enlazada a gates posteriores sin autorizar piloto, captura ni despliegue.
6. P0.5 mantenga válidos los 41 alcances ya importados, obtenga revisión sobre sus hashes, publique o enlace las épicas/issues y asigne un segundo revisor independiente.
7. CI ejecute en GitHub sobre el SHA candidato; la protección de `main` se lea y verifique. Cualquier excepción de lint tiene dueño, fecha de vencimiento y presupuesto de no regresión.
8. Se ejecuten DEP-FE, DEP-BE y DEP-ML de [ACCIONES_TECNICAS.csv](ACCIONES_TECNICAS.csv): remediación probada, locks reproducibles para Python o resolución equivalente, versiones ML controladas y política con responsable/periodicidad.
9. Un aprobador distinto del tesista registre `PASS` o `FAIL` en un issue/acta de tipo `approval`. El silencio o la mera presencia de documentos no cuenta como aprobación.

## Decisión

**G0 = BLOQUEADA.** No debe comenzar PR01 ni trabajo con participantes. El formulario autoriza trabajo técnico local y sintético en unidades independientes `DEP-FE`, `DEP-BE` y `DEP-ML`, además de documentación y gobernanza necesarias para volver a presentar G0.

## Incorporación del formulario del 2026-09-14

Las decisiones se conservan sin datos de contacto en [DECISIONES_G0_SANITIZADAS.json](DECISIONES_G0_SANITIZADAS.json) y su [resumen](DECISIONES_G0_SANITIZADAS.md). La fuente es `Formulario_Decisiones_G0_VisionClass_COMPLETADO_Omar_Quimbita.docx`, `sha256:267e4c8869683610a125c65471b2e3fd0cfebb6a6ef2a156e328dc4e77942349`. El formulario solicita expresamente veredicto **BLOQUEADA**, fija cero participantes autorizados y no autoriza despliegue, datos reales ni publicación remota de issues.

## Seguimiento técnico del 2026-09-13

Se cerró todo lo verificable sin editar producto:

- Los seis YAML de `.github/` se analizaron con PyYAML 6.0.2; se comprobaron seis jobs y cuatro formularios de issue.
- Se importó el plan detallado aportado después de la búsqueda inicial: el DOCX (`sha256:4352015df2a874707cf725564f1e1d56cbe974fb838b414357f50f9786186134`) y su extracción (`sha256:9be008f0a32dbe344fe9596f4ed8ced1b11cef5f62a2001347f3c69c3cb05f58`) contienen 41 encabezados idénticos. El catálogo estructurado valida campos obligatorios y que sus dependencias respeten el orden de `AGENTS.md`.
- Se ejecutaron auditorías de npm y backend con consulta de registros. No se aplicaron correcciones automáticas ni se modificaron manifiestos o lockfiles.
- La auditoría ML se intentó y se registró como no resoluble con el intérprete 3.12 disponible. Debe repetirse en el Python 3.11 objetivo.
- TypeScript y el build frontend pasaron; el build necesitó acceso de red para las fuentes y reiteró que `baseline-browser-mapping` está desactualizado.
- Una instalación backend aislada pasó `check` y `makemigrations --check --dry-run`. La suite delimitada a `api` terminó correctamente, pero confirmó **cero pruebas**. El comando canónico y CI ya evitan descubrir por accidente el script ML de la raíz.
- Las herramientas y cachés temporales se eliminaron después de generar evidencia.

Persisten decisiones que Codex no puede cerrar: ratificación institucional, metodológica, ética y de privacidad; segundo anotador y revisor; configuración remota de GitHub; y aprobación formal de G0.
