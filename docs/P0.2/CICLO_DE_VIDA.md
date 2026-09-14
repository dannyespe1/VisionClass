# P0.2 — Propuesta de retención, revocación, backups y elegibilidad adulta

**Propuesta para revisión; no implementada ni aprobada.** Contexto confirmado por el usuario: un tesista operará VisionClass, los participantes estarán en Ecuador y participarán únicamente estudiantes universitarios mayores de edad (18 años o más); no se usarán datos de menores. Falta identificar universidad/entidad, responsable del tratamiento, tutor y método de comprobación de elegibilidad. Se enlaza con el [inventario D01–D16](INVENTARIO_DATOS.md) y el [modelo de amenazas](INFORME.md). AGENTS.md incorporado durante esta tarea exige modo predeterminado sin transmisión de material crudo, cierre de captura sin consentimiento vigente y no entrenar/interpretar modelos antes de G3. Estas propuestas no conceden una excepción ni aprueban gates.

## 1. Estado actual y calendario propuesto

El código no aplica un calendario general de purga. El panel crea el valor “2 anos” en PrivacyPolicySetting, pero sus usos inspeccionados no programan borrado. SAVE_FRAMES controla escritura, no retención. Los tiempos siguientes son **objetivos internos propuestos para un estudio**, no plazos legales ni configuración actual. Responsable/tutor/privacidad deberán justificarlos por finalidad, protocolo y obligaciones institucionales; cualquier plazo obligatorio aplicable prevalece. No conservar datos “por si acaso”.

| Datos | Propuesta y evento inicial del cómputo | Método futuro / evidencia de cierre | Dueño sugerido |
|---|---|---|---|
| D04 JPEG para inferencia | Procesamiento **en dispositivo**, sin transmisión/persistencia ordinaria; descartar tras inferencia. Sesiones/crops locales en RAM: TTL máximo propuesto 5 min desde último frame y vaciado al terminar/revocar | Test de red/telemetría sin salida de crudos y contadores de buffers; no prometer borrado criptográfico de RAM | ML/frontend |
| D04 imágenes para investigación específica | Desactivadas por defecto. No se autoriza captura/transferencia de dataset crudo en P0.2. Si se necesita un subestudio local, documentar necesidad, protocolo/permiso separado y compatibilidad con gates; staging local cifrado ≤24 h desde captura como propuesta, sin subirlo al servicio | Purga de originales, backups excluidos para staging; cualquier excepción requiere decisión explícita aplicable, no inferida del consentimiento general | Tesista + custodio de datos |
| D05 eventos/rasgos granulares | 30 días desde captura para validación; si el análisis exige más, justificar por escrito el nuevo plazo antes de ampliar | Borrado por sujeto/sesión y comprobación de derivados/linaje; métricas de expirados pendientes | Backend + datos |
| D06/D08/D10 resultados y agregados identificables del estudio | Hasta cierre de análisis, con máximo propuesto de 180 días desde fin de participación; revisión antes de vencer | Separar los resultados de investigación de expedientes académicos institucionales. Anonimizar de forma evaluada o eliminar al vencimiento | Tutor + privacidad + tesista |
| D01/D02/D07/D09 cuenta, matrícula y trazas del estudio | Cierre de participación + 30 días para resolver incidencias; solo mínimos requeridos por protocolo. Calificaciones oficiales: calendario institucional separado, aún pendiente | Cierre de cuenta no debe destruir cursos de terceros por cascada; acta de qué se elimina y qué debe conservarse | Responsable institucional + backend |
| D11 agendas y notificaciones locales | Agenda cumplida/cancelada +30 días; cuerpo de mensajes ≤90 días desde envío, salvo necesidad documentada | Borrar texto de BD y solicitar expiración al proveedor cuando corresponda. Buzón del receptor fuera del control directo | Backend + encargado de comunicaciones |
| D12 permisos, protocolo y comprobantes de consentimiento/retirada | Periodo de rendición de cuentas a fijar por universidad y privacidad; **no fijado** en ausencia de entidad/protocolo | Registro separado de resultados, acceso muy restringido, mínimo identificador y versión. No borrarlo por cascada accidental con la cuenta | Responsable + tutor/privacidad |
| D13 datasets identificables/seudonimizados | Fecha de expiración contractual antes de cada entrega; propuesta: cierre de análisis +30 días y revisión cada 90 días mientras dure el proyecto | Manifest de participantes, export/version, receptor y expiración; destrucción de copias certificada. No publicación abierta de filas ni frames | Custodio + investigador receptor |
| D13 modelos/checkpoints | Revisión al cierre de estudio y en cada retirada que afecte datos de entrenamiento | Mantener linaje y análisis de memorización; decidir retirar/reentrenar. Borrar el dataset no prueba que el modelo haya olvidado un participante | ML + privacidad |
| D14 logs técnicos | 14 días desde evento; auditoría de accesos privilegiados 90 días; pruebas mínimas de eliminación 12 meses propuestos | Sin payloads, tokens, caras, correos ni notas académicas; restringir búsquedas y exportación. Las trazas de eliminación usan ID de expediente seudónimo | Operaciones + privacidad |
| D16 backups | Ventana rodante propuesta 35 días desde copia; no backups indefinidos de datasets/frames | Inventario de copias, caducidad automática y prueba de restauración respetando supresiones | Custodio de backups |

El calendario se debe materializar en registros con: categoría, finalidad, responsable, evento inicial, duración, justificación, excepción, ubicaciones y verificación. Una retención suspensiva por disputa/investigación debe ser específica, autorizada y revisable; no bloquear indefinidamente todo el expediente.

## 2. Revocar no equivale a borrar, ni logout equivale a revocar

Propuesta de cuatro operaciones independientes y verificables:

1. **Detener captura:** cerrar todos los MediaStream, cancelar temporizadores/solicitudes pendientes, vaciar buffers de esa sesión y rechazar nuevos frames para el alcance revocado. El permiso del navegador solo gobierna acceso al dispositivo. Debe probarse también el stream adicional obtenido en `requestCamera` sin conservar su referencia (`course/[courseId]/page.tsx:755`).
2. **Retirar autorización de una finalidad:** separar cámara en vivo, persistencia de rasgos, compartir con docente, investigación/entrenamiento y uso de imágenes. Registrar versión del aviso, finalidad, elección, fecha, sujeto adulto y evidencia de su decisión. Propagar la retirada a backend, proxy, ML, tareas diferidas y exportación; no basta un switch de React.
3. **Revocar acceso:** logout, incidente, cambio de rol, baja del tesista o fin del estudio deben activar una política de invalidación de credenciales. Actualmente logout borra localStorage; no hay endpoint de revocación/blacklist configurado identificado. Decidir access corto, invalidación de refresh y sesión/versión de credencial; probar efecto sobre tokens ya emitidos y cuenta desactivada antes de afirmar revocación inmediata.
4. **Eliminar o limitar datos:** tramitar por finalidad y obligación de conservación. La retirada de investigación no debe eliminar calificaciones oficiales si existe otra justificación válida, ni usarse para retener automáticamente imágenes. Informar exactamente qué se borró, qué se bloqueó, dónde subsisten copias y cuándo expiran.

Flujo operativo futuro: recepción por canal institucional publicado → verificación proporcional de identidad/representación → ID de solicitud sin exposición de datos → suspensión de nuevos tratamientos del alcance → inventario por usuario/sesiones/datasets → ejecución controlada → verificaciones negativas → aviso al participante → seguimiento de terceros/backups. Asignar responsable de respuesta y plazo compatible con normativa; objetivo interno de acuse ≤2 días hábiles, **sin sustituir plazos aplicables**. No exigir una copia de documento de identidad por defecto si la cuenta autenticada o un mecanismo institucional basta.

## 3. Eliminación completa y límites

Antes de automatizar, probar con datos sintéticos una matriz de destinos:

- BD: usuario/matrícula, Session/D2RSession, eventos, D2RResult, quizzes, ContentView, agendas, StudentReport.payload, notificaciones, metadata/notes, tablas de Django/allauth pertinentes.
- Duplicados: atención en enrollment_data, snapshots y texto libre que contenga nombres. Borrar eventos **no** recalcula resúmenes automáticamente en el código revisado.
- Filesystem/objetos: JPEG originales, crops temporales, Parquet, CSV/XLSX/PDF, capturas de pantalla, notebooks, checkpoints y archivos diagnósticos.
- Navegador: jwt_token y cachés de progreso/selección; dispositivos compartidos y descargas locales requieren instrucciones específicas. El servidor no puede certificar haber eliminado archivos de un receptor fuera de su control.
- Proveedores: copias de correo, prompts/respuestas, logs y respaldos conforme al contrato. Solicitar borrado o restricción, conservar comprobante y declarar límites.

**Cascadas peligrosas:** borrar un usuario docente puede borrar sus cursos y datos vinculados de otros alumnos, porque Course.owner usa CASCADE. Borrar un remitente de notificación pone su FK en NULL y deja el texto; las referencias personales embebidas no desaparecen. El comando `cleanup_d2r_baseline` limpia cursos legacy; no es un mecanismo de derechos ni recorre todo el linaje D2R/datasets/backups.

Propuesta de control: previsualización de conteos, aprobación de alcance por custodio, ejecución idempotente, reporte por destino, verificación de ausencia/restricción, y evidencia mínima sin conservar los datos suprimidos. Para modelos, evaluar si retirar el artefacto o reentrenar; no prometer desentrenamiento automático. Para Git/registry, impedir la entrada de secretos/datos desde origen y planificar saneamiento de copias si se descubre exposición real.

## 4. Backups y restauración

**Q actual:** no consta quién respalda, dónde, cifrado, claves, periodicidad, RPO/RTO, retención ni prueba de restauración. Un volumen Docker no acredita backup. GCP/Render disponibles en archivos no acreditan la configuración contratada.

Propuesta concreta:

1. Custodio institucional distinto del acceso cotidiano del tesista; si inicialmente una persona acumula funciones, revisión y autorización de restauración por el tutor/custodio designado. Acceso nominativo, mínimo privilegio y MFA para consola.
2. Backups cifrados en tránsito/reposo, clave separada de la copia y de Git; región/receptores aprobados. Inventariar BD, secretos de recuperación, objetos imprescindibles y las dependencias de restauración. No copiar imágenes transitorias ni datasets a respaldos generales sin propósito definido.
3. Copia diaria y RPO objetivo ≤24 h; RTO objetivo ≤8 h para el estudio, a confirmar por disponibilidad y coste. Prueba inicial y después trimestral o tras cambio de arquitectura. No se presenta como capacidad ya medida.
4. Ventana 35 días con caducidad comprobable. Inmutabilidad puede proteger de borrado malicioso, pero requiere compatibilizar el vencimiento con supresiones. Datos retenidos en backup no disponibles para análisis ordinario.
5. Registro de supresiones/retiradas mínimo, separado de la BD restaurada, retenido durante toda ventana de recuperación más verificación. Restaurar en red aislada, reaplicar supresiones y revocaciones, rotar secretos comprometidos, verificar muestras sintéticas y solo entonces abrir servicio. Nunca reactivar permisos retirados por restaurar un snapshot antiguo.
6. Evidencia: IDs/fechas de copias, prueba de descifrado, tiempos reales de recuperación, conteos consistentes, identidad del restaurador, ausencia de sujetos suprimidos, eliminación del entorno de prueba y fecha de expiración de copias residuales. No incluir datos reales en el informe versionado.

## 5. Participantes universitarios adultos; menores fuera de alcance

El usuario corrigió el alcance: el estudio no usará datos de menores y se dirige a estudiantes universitarios mayores de edad. Se fija **18 años o más** como criterio de inclusión. La pertenencia a una universidad no acredita por sí sola este criterio. Consentimiento de representantes y asentimiento de menores no forman parte del protocolo activo; la regla de AGENTS.md para estudios con menores es condicional y no se aplica a esta población.

Propuesta de protocolo, pendiente de aprobación e implementación:

- Identificar responsable del estudio, tutor, universidad, custodio, revisión ética aplicable y contacto para consultas/retirada. El tesista como operador no determina por sí solo la responsabilidad jurídica.
- Verificar mayoría de edad antes de la recogida de datos del estudio mediante un mecanismo proporcional aprobado por la institución. Preferir confirmación institucional o constancia mínima de elegibilidad; no guardar fecha completa de nacimiento ni copia de documento por defecto. No inferir edad mediante cámara. Si no puede acreditarse el criterio, no iniciar captura ni incluir a la persona en el dataset.
- Recabar consentimiento informado directamente del participante adulto, específico por finalidad: análisis local, persistencia de características, acceso docente e investigación, según el protocolo. Registrar versión del aviso, decisión, fecha y alcance; la aprobación institucional no sustituye esa decisión individual.
- Explicar qué se procesa, quién accede, plazos, límites de los indicadores, forma de detener captura y procedimiento de retirada. La matrícula universitaria o el uso de la plataforma no se tratan como autorización general para la tesis.
- Garantizar participación y retirada sin perjuicio de notas, acceso a contenidos ni relación académica. Cuando un docente reclute o evalúe a sus alumnos, proponer un interlocutor independiente y una alternativa sin cámara o sin participación en el estudio.
- No usar atención/riesgo para sanciones, diagnóstico o decisiones académicas adversas automáticas. Separar resultados experimentales del expediente oficial y ofrecer revisión humana e impugnación.
- Prevenir captura incidental de terceros, incluidos posibles menores en el entorno: encuadre y control del participante, procesamiento local y ausencia de transmisión de crudos en modo predeterminado. No incorporar esas imágenes o registros a datasets. Si se detecta inclusión accidental de datos de una persona menor, detener su tratamiento, restringir el acceso y gestionar exclusión/eliminación de copias y derivados con el custodio, registrando evidencia mínima sin reutilizarlos.
- Publicar la tesis con agregados revisados frente a reidentificación; no publicar caras, IDs ni filas individuales. Revisar consentimiento y evaluación si cambia finalidad, proveedor, modelo o publicación.

**Comprobaciones de elegibilidad futuras:** un participante adulto elegible y que consiente puede continuar; una persona menor o de elegibilidad no confirmada no inicia recogida ni aparece en datasets. Probar los tres casos con datos sintéticos y comprobar ausencia de eventos, características y exportaciones en los casos excluidos. No crear un nuevo repositorio de documentos de identidad para demostrarlo.

**Estado:** no se identificó un control de elegibilidad por edad ni consentimiento versionado en el esquema propio; las opciones UI tampoco gobiernan todos los destinos. La exclusión de menores es una decisión del estudio, no una funcionalidad ya implementada. Los controles de consentimiento, privacidad y revocación siguen siendo necesarios para adultos. Incorporar menores en el futuro requeriría cambiar expresamente el protocolo y reevaluar privacidad/ética; no está autorizado por este documento.
