# Decisión de G3

**Decisión:** `APPROVED_REVIEWER_ATTESTED`

**Fecha:** 2026-09-15

**Rol decisor:** revisor externo

G3 queda aprobado mediante atestación independiente comunicada por el propietario. No se registran nombres, documentos privados ni valores no suministrados.

## Autorización del flujo de características — resuelta técnicamente

El usuario autorizó explícitamente el 2026-09-15 que VisionClass envíe y persista desde el navegador el siguiente sobre derivado:

- destino: backend autenticado de VisionClass;
- finalidad: persistir observaciones normalizadas para ventanas temporales y evaluación posterior, nunca vigilancia o decisiones operativas;
- contenido: geometría normalizada, presencia, luminancia resumida, confianza, razón de no observabilidad, timestamps, versión de extractor/preprocesamiento y perfil Edge;
- exclusiones: imágenes, video, audio, blobs, correo, nombre, `user_id` declarado por el cliente y etiquetas de estado interno;
- controles: consentimiento vigente para procesamiento local y persistencia derivada, sesión autenticada, idempotencia, retención/borrado de PR14 y feature flags apagados por defecto.

La implementación queda sometida a la retención y eliminación de PR14, acceso autenticado del propio participante y conservación de eventos `no_observable` únicamente para auditoría de calidad. Los flags permanecen apagados hasta completar las aprobaciones siguientes.

## Pendientes científicos e institucionales

P0.3 v0.2 fue preparada prospectivamente sin consultar outcomes o scores reales. Conserva v0.1, corrige H3 para distinguir tendencia de estabilidad y define volatilidad, persistencia, transiciones, episodios, recuperación, entropía y cobertura. El revisor ratificó SESOI, N, máximo, AUROC-LI, sensibilidad `>= 0.70`, especificidad `>= 0.80` y mejora AUPRC.

| Bloqueo | Evidencia verificable requerida | Responsable que debe aprobar | Estado |
| --- | --- | --- | --- |
| D01 — sede y marco | protocolo institucional con ESPE Latacunga, población adulta, periodo y canal de reclutamiento | autoridad institucional + ética | atestado por revisor; sin hash suministrado |
| D03 — SESOI, muestra y M1 | ratificación independiente de SESOI/N y aceptación firmada del threshold y efectos mínimos de M1 v0.2 | metodólogo/estadístico independiente | atestado con sensibilidad 0.70 y demás valores; sin hash |
| D05 — observación | segundo anotador identificado y procedimiento presencial sin grabación aceptado | ética + privacidad | atestado; segundo anotador asignado; sin hash |
| D08 — congelamiento | aprobador independiente, hash firmado y sello temporal externo/Zenodo de v0.2 | director + aprobador independiente | atestado con aprobador y registro de sello; sin hash |
| Privacidad, ética y protocolo | resoluciones o actas aplicables al flujo consentido y a la población adulta | instancias competentes | atestado bajo condiciones privadas; sin hash |
| Compatibilidad Edge | matriz manual firmada de navegadores/dispositivos: permiso denegado, cámaras múltiples, suspensión, batería limitada y liberación de recursos | QA/revisor independiente | aprobada por atestación de revisor externo el 2026-09-15; detalle no suministrado |
| Shadow mode PR17 | acta que confirma calibración en shadow mode, sin decisión/intervención ni interpretación de atención interna | responsable científico + producto | atestado con roles establecidos; sin hash |

Para preservar confidencialidad, el contenido de las aprobaciones no se incorpora al repositorio. El propietario indicó expresamente que no proporcionará SHA-256 y autorizó continuar considerando resueltas las aprobaciones comunicadas. `ATESTACION_MINIMA_G3.json` registra la respuesta como atestación sin hash, sin inventar fechas, roles, códigos ni huellas. Esta excepción documental satisface los bloques de aprobación, pero no sustituye la matriz ni la decisión final independiente de G3.

La matriz requerida fue diseñada en `MATRIZ_COMPATIBILIDAD_EDGE_G3.md`; su registro está en `EJECUCION_MATRIZ_EDGE_G3.csv`. B01 fue autorizado y B01–B08 tienen corrección técnica en la rama `pr18b-g3-compat`. El smoke test local de C02 pasó con cero observaciones persistidas. El revisor externo atestó la aprobación de P01–P07, C05 y C09 sin fallos bloqueantes; como no se suministraron detalles por plataforma, estos no se infieren.

Documentos de la enmienda:

- `docs/P0.3/ENMIENDA_v0.2.md`
- `docs/P0.3/PREREGISTRO_CONFIRMATORIO_v0.2.json`
- `docs/P0.3/REVISION_NOVEDAD_2026-09-15.md`
- `docs/P0.5/PLAN_OLA6_v0.2.md`

G3 habilita PR19 bajo el protocolo P0.3 v0.2. La aprobación no habilita por sí sola participantes reales, despliegue ni activación de flags; cada uso de datos debe conservar consentimiento, procedencia y alcance aprobados.
