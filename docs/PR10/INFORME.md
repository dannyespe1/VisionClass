# PR10 — Contrato de eventos v2

Se publica `contracts/attention-event-v2.schema.json` con versión fija, UUID idempotente, tipo e identificador de sesión, tiempo de captura, características numéricas con unidad definida por nombre, calidad, dispositivo minimizado y versión/finalidades de consentimiento.

El backend valida estrictamente cualquier `data` que declare `contract_version`; campos desconocidos se rechazan con detalle seguro. Los eventos v1 que no declaran versión siguen aceptados durante la transición. Frontend, backend y ML consumen los mismos fixtures versionados y prueban tipos, rangos, duplicados y campos desconocidos.

El flag `EVENT_CONTRACT_V2=False` mantiene el despliegue desactivado por defecto. La activación requiere publicar primero productores v2 y observar rechazos; el rollback consiste en apagar el flag y mantener el adaptador v1, sin reinterpretar eventos históricos.

No se añadieron identificadores personales al contrato y el fixture inválido comprueba que un campo de correo es rechazado sin reflejar su valor.
