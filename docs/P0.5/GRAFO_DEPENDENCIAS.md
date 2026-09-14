# Grafo de dependencias de VisionClass

**Estado:** alcance importado y verificable; no constituye aprobación de gates.

La secuencia aprobada en `AGENTS.md` controla el orden de ejecución:

`G0 → PR01 → PR03 → PR07 → PR02 → PR04 → PR05 → PR06 → G1 → PR08 → PR09 → PR10 → PR29 → PR30 → PR31 → G2 → PR11 → PR12 → PR13 → PR33 → PR14 → PR15 → PR16 → PR17 → PR18 → G3 → PR19 → PR20 → PR21 → PR22 → PR23 → PR24 → G4 → PR25 → PR26 → PR27 → PR28 → PR32 → PR34 → G5 → PR35 → PR36 → PR37 → PR38 → PR39 → G6 → PR40 → PR41`

Las aristas siguientes reflejan únicamente identificadores explícitos en el plan fuente. Las condiciones metodológicas, éticas y operativas conservadas en la tabla también son prerrequisitos.

```mermaid
flowchart LR
  G0[G0] --> PR01[PR01]
  PR01[PR01] --> PR02[PR02]
  P0_1[P0.1] --> PR02[PR02]
  PR01[PR01] --> PR03[PR03]
  P0_1[P0.1] --> PR03[PR03]
  PR03[PR03] --> PR04[PR04]
  PR03[PR03] --> PR05[PR05]
  PR07[PR07] --> PR05[PR05]
  PR02[PR02] --> PR06[PR06]
  PR03[PR03] --> PR06[PR06]
  PR04[PR04] --> PR06[PR06]
  PR05[PR05] --> PR06[PR06]
  PR07[PR07] --> PR06[PR06]
  PR01[PR01] --> PR07[PR07]
  PR07[PR07] --> PR08[PR08]
  PR08[PR08] --> PR09[PR09]
  PR08[PR08] --> PR10[PR10]
  PR09[PR09] --> PR10[PR10]
  PR06[PR06] --> PR11[PR11]
  PR10[PR10] --> PR12[PR12]
  PR11[PR11] --> PR12[PR12]
  PR12[PR12] --> PR13[PR13]
  PR07[PR07] --> PR14[PR14]
  PR12[PR12] --> PR14[PR14]
  PR13[PR13] --> PR14[PR14]
  PR33[PR33] --> PR14[PR14]
  PR10[PR10] --> PR15[PR15]
  PR15[PR15] --> PR16[PR16]
  PR16[PR16] --> PR17[PR17]
  PR17[PR17] --> PR18[PR18]
  PR16[PR16] --> PR19[PR19]
  PR17[PR17] --> PR19[PR19]
  G3[G3] --> PR19[PR19]
  PR19[PR19] --> PR20[PR20]
  PR13[PR13] --> PR21[PR21]
  PR20[PR20] --> PR21[PR21]
  PR09[PR09] --> PR22[PR22]
  PR21[PR21] --> PR22[PR22]
  PR19[PR19] --> PR23[PR23]
  PR20[PR20] --> PR23[PR23]
  PR21[PR21] --> PR23[PR23]
  PR22[PR22] --> PR23[PR23]
  PR19[PR19] --> PR24[PR24]
  G3[G3] --> PR24[PR24]
  PR09[PR09] --> PR25[PR25]
  PR23[PR23] --> PR25[PR25]
  PR24[PR24] --> PR25[PR25]
  PR07[PR07] --> PR26[PR26]
  PR18[PR18] --> PR26[PR26]
  PR25[PR25] --> PR27[PR27]
  PR26[PR26] --> PR27[PR27]
  PR23[PR23] --> PR28[PR28]
  PR27[PR27] --> PR28[PR28]
  PR07[PR07] --> PR29[PR29]
  PR08[PR08] --> PR29[PR29]
  PR07[PR07] --> PR30[PR30]
  PR08[PR08] --> PR30[PR30]
  PR10[PR10] --> PR30[PR30]
  PR08[PR08] --> PR31[PR31]
  PR29[PR29] --> PR32[PR32]
  PR30[PR30] --> PR32[PR32]
  PR31[PR31] --> PR32[PR32]
  PR07[PR07] --> PR33[PR33]
  PR08[PR08] --> PR33[PR33]
  P0_2[P0.2] --> PR33[PR33]
  PR23[PR23] --> PR34[PR34]
  PR32[PR32] --> PR34[PR34]
  PR33[PR33] --> PR34[PR34]
  PR17[PR17] --> PR35[PR35]
  PR23[PR23] --> PR35[PR35]
  PR32[PR32] --> PR35[PR35]
  PR23[PR23] --> PR36[PR36]
  PR32[PR32] --> PR36[PR36]
  PR34[PR34] --> PR36[PR36]
  PR28[PR28] --> PR37[PR37]
  PR32[PR32] --> PR37[PR37]
  PR34[PR34] --> PR37[PR37]
  PR23[PR23] --> PR38[PR38]
  PR32[PR32] --> PR38[PR38]
  PR34[PR34] --> PR38[PR38]
  PR35[PR35] --> PR38[PR38]
  PR13[PR13] --> PR39[PR39]
  PR21[PR21] --> PR39[PR39]
  PR22[PR22] --> PR39[PR39]
  PR27[PR27] --> PR39[PR39]
  PR34[PR34] --> PR40[PR40]
  PR35[PR35] --> PR40[PR40]
  PR36[PR36] --> PR40[PR40]
  PR37[PR37] --> PR40[PR40]
  PR38[PR38] --> PR40[PR40]
  PR39[PR39] --> PR40[PR40]
  G6[G6] --> PR40[PR40]
  PR02[PR02] --> PR41[PR41]
  PR40[PR40] --> PR41[PR41]
```

## Dependencias literales de la fuente

| PR | Ola | Prerrequisito fuente |
| --- | --- | --- |
| PR01 | Ola 1 Arquitectura identidad y consentimiento | Puerta G0 aprobada |
| PR02 | Ola 2 Base segura observable | PR01 y el inventario de dependencias D2R de P0.1 |
| PR03 | Ola 1 Arquitectura identidad y consentimiento | PR01 y el mapa de autenticación de P0.1 |
| PR04 | Ola 2 Base segura observable | PR03 |
| PR05 | Ola 2 Base segura observable | PR03 y PR07 |
| PR06 | Ola 2 Base segura observable | PR02, PR03, PR04, PR05 y PR07 |
| PR07 | Ola 1 Arquitectura identidad y consentimiento | PR01 y aprobación inicial de privacidad, ética y tratamiento de participantes |
| PR08 | Ola 3 Datos contratos e instrumentos | PR07 |
| PR09 | Ola 3 Datos contratos e instrumentos | PR08 |
| PR10 | Ola 3 Datos contratos e instrumentos | PR08 y PR09 |
| PR11 | Ola 4 Estado distribuido retención y bóveda | PR06 |
| PR12 | Ola 4 Estado distribuido retención y bóveda | PR10 y PR11 |
| PR13 | Ola 4 Estado distribuido retención y bóveda | PR12 |
| PR14 | Ola 4 Estado distribuido retención y bóveda | PR07, PR12, PR13 y PR33 |
| PR15 | Ola 5 Edge calidad y preparación de datos | PR10 |
| PR16 | Ola 5 Edge calidad y preparación de datos | PR15 |
| PR17 | Ola 5 Edge calidad y preparación de datos | PR16 |
| PR18 | Ola 5 Edge calidad y preparación de datos | PR17 |
| PR19 | Ola 6 Modelado temporal | PR16, PR17 y Puerta G3 de preparación de datos |
| PR20 | Ola 6 Modelado temporal | PR19 y protocolo de evaluación congelado |
| PR21 | Ola 6 Modelado temporal | PR13 y PR20 |
| PR22 | Ola 6 Modelado temporal | PR09 y PR21 |
| PR23 | Ola 6 Modelado temporal | PR19, PR20, PR21, PR22 y protocolo de evaluación congelado |
| PR24 | Ola 6 Modelado temporal | PR19 y Puerta G3 de preparación de datos |
| PR25 | Ola 7 Adaptación validación y equidad | PR09, PR23, PR24 y decisión documentada de selección del modelo |
| PR26 | Ola 7 Adaptación validación y equidad | PR07 y PR18 |
| PR27 | Ola 7 Adaptación validación y equidad | PR25 y PR26 |
| PR28 | Ola 7 Adaptación validación y equidad | PR23 y PR27 |
| PR29 | Ola 3 Datos contratos e instrumentos | PR07, PR08 y aprobación metodológica y ética |
| PR30 | Ola 3 Datos contratos e instrumentos | PR07, PR08 y PR10 |
| PR31 | Ola 3 Datos contratos e instrumentos | PR08 y aprobación metodológica y ética |
| PR32 | Ola 7 Adaptación validación y equidad | PR29, PR30, PR31 y evidencia de suficiencia de muestra |
| PR33 | Ola 4 Estado distribuido retención y bóveda | PR07, PR08 y diseño de protección de datos aprobado en P0.2 |
| PR34 | Ola 7 Adaptación validación y equidad | PR23, PR32, PR33 y evidencia de suficiencia de muestra por grupo |
| PR35 | Ola 8 Producto y operación | PR17, PR23 y PR32 |
| PR36 | Ola 8 Producto y operación | PR23, PR32 y PR34 |
| PR37 | Ola 8 Producto y operación | PR28, PR32 y PR34 |
| PR38 | Ola 8 Producto y operación | PR23, PR32, PR34, PR35 y aprobación de seguridad de intervención |
| PR39 | Ola 8 Producto y operación | PR13, PR21, PR22, PR27 y flujos de producto integrados |
| PR40 | Ola 9 Piloto y cierre | PR34 a PR39 y Puerta G6 aprobada |
| PR41 | Ola 9 Piloto y cierre | PR02 y PR40 |

## Regla de ejecución

Una arista expresa necesidad semántica; la posición en la secuencia expresa autorización para iniciar. Ambas condiciones deben cumplirse. Las dependencias en lenguaje natural requieren evidencia enlazada en el issue. No se paralelizan grupos `serializar` de `COLISIONES_WORKTREES.csv`.

`PLAN_TRABAJO.csv` conserva la secuencia operativa y `PLAN_PR_DETALLADO.json` conserva el alcance normativo completo.
