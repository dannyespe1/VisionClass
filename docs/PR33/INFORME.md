# PR33 — Bóveda demográfica separada

La bóveda usa tablas con prefijo `vault_`, seudónimo de investigación distinto y payload cifrado con Fernet. El registro demográfico no contiene FK hacia usuarios, sesiones, cursos o inferencias; el mapeo operativo vive en una tabla separada y no se expone por serializers, admin ni endpoints.

Solo un administrador autenticado puede usar el servicio de bóveda y todo intento queda auditado con un hash del seudónimo. Los campos voluntarios están en allowlist; se rechazan respuestas académicas y contenido libre no previsto.

`DEMOGRAPHIC_VAULT=False` permanece apagado. La clave debe residir en el gestor de secretos. Antes de producción aún se requiere un esquema/base con rol SQL separado, acceso temporal, revisión de reidentificación y aprobación P0.2.
