# Benchmark local PR25

**Fecha:** 2026-09-16

**Entorno canónico:** imagen `vision_system-frontend:latest`, Node.js 20.20.2, CPU.

La prueba procesa 10 000 actualizaciones secuenciales del HMM. El presupuesto de ingeniería es menor a 500 ms para el fixture completo. La ejecución observada fue aproximadamente 23 ms y pasó el presupuesto con amplio margen. El valor es diagnóstico del entorno de prueba, no una garantía de dispositivo ni una medición de aula.

| Backend | Estado | Motivo |
| --- | --- | --- |
| JavaScript CPU | Ejecutado, PASS | Backend elegido para el HMM pequeño |
| WebAssembly | No ejecutado | El artefacto seleccionado no requiere ni incluye módulo WASM |
| WebGPU | No ejecutado | No aporta ventaja justificada para este HMM y no existe harness de navegador/dispositivo aprobado |

No se aplicó cuantización. Una variante WASM, WebGPU o cuantizada requerirá nuevo artefacto, hash, firma operativa, paridad, benchmark por dispositivo y revisión de degradación antes de ser elegible.
