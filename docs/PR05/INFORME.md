# PR05 — Captura y envíos acotados

- **Estado:** CANDIDATO TÉCNICO — NO DESPLEGADO
- **Fecha:** 2026-09-14
- **Base:** Ola 1 `82f80da95b11bd204d4d650b94ff44e0fab9cde8`
- **Control:** `NEXT_PUBLIC_BOUNDED_CAPTURE_QUEUE=true` por defecto; `false` detiene envíos visuales.
- **Gate:** G0 continúa `BLOQUEADA`; cero participantes y cero datos reales.
- **Propietarios sugeridos:** frontend y backend; privacidad valida la ausencia de persistencia visual.

## Resultado comprobado

Curso y D2R usan una cola común con una solicitud activa y una captura pendiente reemplazable. Una nueva ventana sustituye la pendiente anterior, las respuestas que ya quedaron obsoletas no actualizan la UI y detener cámara, ocultar pestaña, revocar o desmontar aborta la solicitud y elimina la pendiente. Cada solicitud tiene deadline e `Idempotency-Key` estable hasta terminar.

Las solicitudes visuales se intentan una sola vez. El helper de backoff está separado y nombrado para eventos no visuales. No existe DLQ de frames. El servicio ML ya no ofrece `SAVE_FRAMES` ni escribe JPEG; limita tipo y tamaño de cada frame antes de decodificar. El buffer temporal del modelo permanece en RAM, acotado por `SEQUENCE_LENGTH`; no se exporta ni se escribe a disco.

La UI muestra `enviando`, `red lenta`, `sin confirmación`, `listo` o `detenido`. Un timeout, error o respuesta obsoleta no se presenta como medición confirmada.

## Evidencia, inferencias y preguntas abiertas

### Evidencia comprobada

- Cuatro pruebas Node cubren capacidad máxima, reemplazo, obsolescencia, cancelación, deadline sin retry y backoff no visual.
- La cola no crea blobs hasta que una tarea pasa a activa; la pendiente conserva una función, no material visual.
- El proxy conserva la clave de idempotencia válida generada por la cola.
- Búsqueda estática confirma que la configuración ejecutable ML ya no contiene `SAVE_FRAMES` ni `FRAMES_DIR`.

### Inferencias

- La memoria de transporte del navegador permanece acotada porque solo una tarea activa puede mantener un Blob y la pendiente aún no captura.
- La estabilidad con una cámara real y throttling del navegador requiere un ensayo E2E controlado; no se usaron personas ni imágenes reales.

### Preguntas abiertas

- Operación debe confirmar el deadline por entorno contra el SLO de P0.4.
- PR06 debe exponer contadores agregados de descartes, timeout y error sin identificadores personales.
- El buffer temporal del modelo necesita una política explícita de expiración por sesión en un PR posterior de estado distribuido.

## Riesgos priorizados

| Prioridad | Riesgo residual | Control actual | Responsable y evidencia para cerrar |
| --- | --- | --- | --- |
| Alta | Sin ensayo E2E con latencia y navegador objetivo | Máquina de estados y pruebas deterministas | QA/frontend: perfil sintético de red y heap |
| Alta | Buffer temporal ML por sesión puede quedar en RAM | `deque(maxlen=SEQUENCE_LENGTH)` | ML/PR13: TTL y límite global medidos |
| Media | Reemplazo agresivo reduce cobertura temporal | Descartes contabilizados | Investigación: umbral de cobertura de P0.4 |
| Media | Configuración de deadline puede divergir del proxy | Defaults 4,5 s frente a proxy 5 s | Plataforma: validar manifiestos por entorno |

## Rollback

Fijar `NEXT_PUBLIC_BOUNDED_CAPTURE_QUEUE=false` detiene la captura; no restaura el envío paralelo anterior. Para recuperar servicio se corrige la cola o se usa una frecuencia más conservadora manteniendo capacidad 2, idempotencia, cancelación y cero persistencia visual.

## Criterios objetivos de aceptación

- [x] Máximo una solicitud activa y una pendiente reemplazable por flujo de captura.
- [x] Ventanas y respuestas obsoletas se descartan y contabilizan.
- [x] Stop, revocación, navegación y desmontaje cancelan trabajo pendiente.
- [x] Cada solicitud tiene deadline e idempotencia.
- [x] Frames no tienen retry, DLQ ni persistencia en disco.
- [x] Backoff existe solo como helper separado para eventos no visuales.
- [x] La UI distingue envío, cola, degradación, confirmación y detención.
- [x] El flag deshabilitado falla cerrado.
- [ ] Ensayo E2E de red, heap y recuperación en navegador objetivo.
- [ ] Revisión independiente de privacidad y frontend.

