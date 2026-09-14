# Decisiones saneadas del formulario G0

**Estado:** requisitos incorporados; **G0 permanece BLOQUEADA**.
**Fuente:** `Formulario_Decisiones_G0_VisionClass_COMPLETADO_Omar_Quimbita.docx` (`sha256:267e4c8869683610a125c65471b2e3fd0cfebb6a6ef2a156e328dc4e77942349`).
**Extracción contrastada:** `completed_form_extract.txt` (`sha256:28ec78f5af46b50b70124c6613781a345e60c7cdf21d92f9feffdf68509e2cd5`).

El registro omite correo, firma y datos de contacto. Usa `tesista_operador` como identificador funcional. La fuente asigna a esa persona ejecución técnica, operación y custodia, pero no autoridad para autoaprobar ética, privacidad institucional, metodología confirmatoria, validez, equidad, piloto o G0.

## Alcance autorizado ahora

- Documentación y evidencia versionable.
- Pruebas locales con datos sintéticos.
- Preparación local de las 53 unidades e issues, sin publicación remota.
- PR técnicos independientes `DEP-FE`, `DEP-BE` y `DEP-ML`, en ese orden y sin mezclarlos.

Hay **cero participantes autorizados**. No se autoriza reclutamiento, captura o tratamiento de datos reales, despliegue de piloto ni presentación de G0 como aprobada.

## Decidido

- Una tarea propia de cancelación visual sustituirá gradualmente D2R. El histórico quedará legible en solo lectura y PR41 realizará el retiro final.
- El constructo es desempeño atencional dentro de la tarea propia. No equivale a atención general, mirada, comprensión, diagnóstico, motivación, integridad académica o riesgo causal.
- La sesión prevista tiene 14 fases de 20 segundos. Se fijan TA, C, O, precisión, exhaustividad, `F1_tarea` y CON; `no_observable` nunca equivale a cero atención.
- El autoinforme se aplicará después de las fases 3, 6, 9, 12 y 14. La observación será presencial, sin grabación y con dos anotadores ciegos e independientes.
- El modo visual será shadow, sin decisiones educativas automáticas y sin transmisión o persistencia de material visual crudo por defecto.
- Se adopta squash merge, un stack local serial, corrección completa del lint antes de reconsiderar G0 y pruebas backend/frontend con controles negativos.
- Los SLO, límites de cola, presupuesto de USD 75/mes y gates P0.4 se aceptan como requisitos iniciales; aún no son resultados demostrados.

## Propuesto y pendiente de ratificación

- ESPE Latacunga como sede, con coordinación académica de UNMSM; entidad responsable, marco y periodo requieren ratificación institucional.
- SESOI provisional de 0.10 unidades de `F1_tarea`, N objetivo 80 y máximo 100; requieren simulación y revisión metodológica antes de reclutar.
- Zenodo como registro del preregistro; requiere aprobador independiente y sello externo.
- Render como plataforma provisional; región, contrato, cuenta, capacidad, backup y restore deben verificarse antes de datos reales.
- El plazo institucional para consentimiento y retirada sigue pendiente. Los demás plazos son objetivos de diseño y deben demostrarse técnicamente.

## Bloqueado por humano o autoridad externa

- Tutor/director, revisión científica y metodológica independiente, instancia ética, privacidad institucional, segundo anotador, suplente operativo y aprobador G0 no están designados o no han ratificado.
- `main` continúa con protección remota desconocida y `applied=false`; falta un segundo revisor CODEOWNERS.
- El protocolo, consentimiento adulto, contratos del proveedor, presupuesto institucional, política de backups y sello del preregistro siguen pendientes.

## Listo para implementar

1. `DEP-FE`: actualizar Next, Axios, PostCSS y transitivas vulnerables, conservar `package-lock.json`, evitar `npm audit fix` automático y ejecutar audit, lint, tipos, build y pruebas disponibles.
2. `DEP-BE`: autorizado después de cerrar DEP-FE, en un PR independiente.
3. `DEP-ML`: autorizado después de DEP-BE, usando Python 3.11 y resolución reproducible.

El detalle estructurado, incluidos R01–R14, se conserva en [DECISIONES_G0_SANITIZADAS.json](DECISIONES_G0_SANITIZADAS.json).
