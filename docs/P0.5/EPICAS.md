# Épicas preparadas para GitHub Issues

Estos cuerpos separan código, operación y aprobación. Las casillas no representan aprobación ni ejecución.

## EPIC-P0 — Preparación y G0

**Resultado:** reunir evidencia P0.1–P0.5 y decidir G0 antes de cualquier PR de producto.
**Propietario sugerido:** sponsor del estudio.
**Estado:** bloqueado.

- [ ] `operations` P0.1 — Auditoría y línea base
- [ ] `operations` P0.2 — Datos, amenazas y privacidad
- [ ] `operations` P0.3 — Constructo, protocolo y evidencia
- [ ] `operations` P0.4 — Umbrales y suspensión
- [ ] `operations` P0.5 — Preparación del repositorio
- [ ] `approval` G0 — acta independiente basada en P0.1–P0.5

## EPIC-G1 — PR01 a PR06 y aprobación G1

**Dependencia de inicio:** G0.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR01 — Registrar la arquitectura objetivo _(prerrequisito: Puerta G0 aprobada)_
- [ ] `code` PR03 — Cerrar suplantación de identidad _(prerrequisito: PR01 y el mapa de autenticación de P0.1)_
- [ ] `code` PR07 — Formalizar protocolo y consentimiento _(prerrequisito: PR01 y aprobación inicial de privacidad, ética y tratamiento de participantes)_
- [ ] `code` PR02 — Desacoplar D2R del flujo principal _(prerrequisito: PR01 y el inventario de dependencias D2R de P0.1)_
- [ ] `code` PR04 — Aplicar mínimo privilegio al servicio ML _(prerrequisito: PR03)_
- [ ] `code` PR05 — Controlar captura y envíos _(prerrequisito: PR03 y PR07)_
- [ ] `code` PR06 — Crear pruebas y observabilidad mínima _(prerrequisito: PR02, PR03, PR04, PR05 y PR07)_
- [ ] `approval` G1 — decisión sobre evidencia del tramo

## EPIC-G2 — PR08 a PR31 y aprobación G2

**Dependencia de inicio:** G1.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR08 — Separar observaciones y estados inferidos _(prerrequisito: PR07)_
- [ ] `code` PR09 — Registrar modelos y artefactos _(prerrequisito: PR08)_
- [ ] `code` PR10 — Versionar el contrato de eventos _(prerrequisito: PR08 y PR09)_
- [ ] `code` PR29 — Capturar autoinforme momentáneo _(prerrequisito: PR07, PR08 y aprobación metodológica y ética)_
- [ ] `code` PR30 — Integrar interacción académica _(prerrequisito: PR07, PR08 y PR10)_
- [ ] `code` PR31 — Crear anotación de observadores _(prerrequisito: PR08 y aprobación metodológica y ética)_
- [ ] `approval` G2 — decisión sobre evidencia del tramo

## EPIC-G3 — PR11 a PR18 y aprobación G3

**Dependencia de inicio:** G2.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR11 — Incorporar Redis _(prerrequisito: PR06)_
- [ ] `code` PR12 — Persistir estado temporal distribuido _(prerrequisito: PR10 y PR11)_
- [ ] `code` PR13 — Procesar eventos con Redis Streams _(prerrequisito: PR12)_
- [ ] `code` PR33 — Separar la bóveda demográfica _(prerrequisito: PR07, PR08 y diseño de protección de datos aprobado en P0.2)_
- [ ] `code` PR14 — Aplicar retención y eliminación _(prerrequisito: PR07, PR12, PR13 y PR33)_
- [ ] `code` PR15 — Extraer características en el navegador _(prerrequisito: PR10)_
- [ ] `code` PR16 — Normalizar características _(prerrequisito: PR15)_
- [ ] `code` PR17 — Crear puerta de calidad y estado no observable _(prerrequisito: PR16)_
- [ ] `code` PR18 — Habilitar perfiles de ejecución Edge _(prerrequisito: PR17)_
- [ ] `approval` G3 — decisión sobre evidencia del tramo

## EPIC-G4 — PR19 a PR24 y aprobación G4

**Dependencia de inicio:** G3.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR19 — Construir baselines reproducibles _(prerrequisito: PR16, PR17 y Puerta G3 de preparación de datos)_
- [ ] `code` PR20 — Implementar HMM o modelo de espacio de estados _(prerrequisito: PR19 y protocolo de evaluación congelado)_
- [ ] `code` PR21 — Exponer el motor temporal _(prerrequisito: PR13 y PR20)_
- [ ] `code` PR22 — Desplegar modelos con shadow mode y rollback _(prerrequisito: PR09 y PR21)_
- [ ] `code` PR23 — Evaluar el modelo dinámico _(prerrequisito: PR19, PR20, PR21, PR22 y protocolo de evaluación congelado)_
- [ ] `code` PR24 — Añadir baseline LSTM o GRU _(prerrequisito: PR19 y Puerta G3 de preparación de datos)_
- [ ] `approval` G4 — decisión sobre evidencia del tramo

## EPIC-G5 — PR25 a PR34 y aprobación G5

**Dependencia de inicio:** G4.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR25 — Exportar inferencia local _(prerrequisito: PR09, PR23, PR24 y decisión documentada de selección del modelo)_
- [ ] `code` PR26 — Medir recursos del dispositivo _(prerrequisito: PR07 y PR18)_
- [ ] `code` PR27 — Crear scheduler adaptativo _(prerrequisito: PR25 y PR26)_
- [ ] `code` PR28 — Generar benchmark y frontera de Pareto _(prerrequisito: PR23 y PR27)_
- [ ] `code` PR32 — Calcular validez y acuerdo _(prerrequisito: PR29, PR30, PR31 y evidencia de suficiencia de muestra)_
- [ ] `code` PR34 — Auditar equidad _(prerrequisito: PR23, PR32, PR33 y evidencia de suficiencia de muestra por grupo)_
- [ ] `approval` G5 — decisión sobre evidencia del tramo

## EPIC-G6 — PR35 a PR39 y aprobación G6

**Dependencia de inicio:** G5.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR35 — Construir panel del estudiante _(prerrequisito: PR17, PR23 y PR32)_
- [ ] `code` PR36 — Construir panel del docente _(prerrequisito: PR23, PR32 y PR34)_
- [ ] `code` PR37 — Construir panel de investigación _(prerrequisito: PR28, PR32 y PR34)_
- [ ] `code` PR38 — Implementar intervenciones basadas en reglas _(prerrequisito: PR23, PR32, PR34, PR35 y aprobación de seguridad de intervención)_
- [ ] `code` PR39 — Preparar operación y pruebas de carga _(prerrequisito: PR13, PR21, PR22, PR27 y flujos de producto integrados)_
- [ ] `approval` G6 — decisión sobre evidencia del tramo

## EPIC-CLOSE — PR40 a PR41

**Dependencia de inicio:** G6.
**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.

- [ ] `code` PR40 — Publicar candidato de piloto _(prerrequisito: PR34 a PR39 y Puerta G6 aprobada)_
- [ ] `code` PR41 — Archivar D2R definitivamente _(prerrequisito: PR02 y PR40)_

## Regla para publicación

Cada issue hijo debe copiar su objetivo, cambios, pruebas, definición de terminado, riesgo y rollback desde `PLAN_PR_DETALLADO.json`, enlazar esta épica y declarar los archivos previstos y grupos de colisión. Una persona responsable debe ratificar el contenido importado antes de marcarlo listo. Publicar una épica no desbloquea ninguna unidad ni equivale a aprobar un gate.
