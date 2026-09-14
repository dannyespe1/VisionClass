# Evidencia de dependencias para G0

## Decisión de tratamiento del 2026-09-14

El formulario G0 saneado autoriza tres unidades técnicas exclusivas y seriales: `DEP-FE → DEP-BE → DEP-ML`. `DEP-FE` puede comenzar con pruebas locales y sintéticas; `DEP-BE` y `DEP-ML` esperan a la unidad anterior. No se autoriza `npm audit fix` automático, mezcla de manifiestos entre unidades, despliegue ni datos reales. La autorización y su SHA fuente están en [DECISIONES_G0_SANITIZADAS.json](DECISIONES_G0_SANITIZADAS.json).

**Fecha de consulta:** 2026-09-13
**Alcance:** auditoría y preparación; no se cambiaron versiones, manifiestos ni lockfiles.

## Frontend

`npm audit --prefix frontend --json` terminó con código 1 y reportó **17 paquetes vulnerables**: 1 crítico, 11 altos, 4 moderados y 1 bajo. Entre las dependencias directas afectadas aparecen `next`, `axios`, `postcss` y `baseline-browser-mapping`. El resultado completo está en [npm-audit-2026-09-13.json](npm-audit-2026-09-13.json).

`npm outdated --prefix frontend --json` terminó con código 1 y enumeró **48 paquetes** cuyo `current` difiere de `wanted` o `latest`. Entre ellos están `next` 16.0.1 frente a 16.3.5, `axios` 1.13.1 frente a 1.20.0 y `postcss` 8.5.6 frente a 8.5.28. El registro completo está en [npm-outdated-2026-09-13.json](npm-outdated-2026-09-13.json).

Estos datos son una fotografía del registro en la fecha indicada. `fixAvailable` no autoriza ejecutar `npm audit fix`: cada actualización requiere revisar compatibilidad, ejecutar lint/tipos/build y pruebas relevantes, y conservar rollback del lockfile.

## Backend

`pip-audit 2.9.0 -r backend/requirements.txt` resolvió 35 paquetes y terminó con código 1: **109 registros de vulnerabilidad en 9 paquetes**.

| Paquete resuelto | Versión | Registros |
| --- | ---: | ---: |
| Django | 5.2.7 | 29 |
| djangorestframework | 3.16.1 | 2 |
| requests | 2.32.3 | 2 |
| sqlparse | 0.5.3 | 6 |
| djangorestframework-simplejwt | 5.3.1 | 1 |
| django-allauth | 0.63.6 | 3 |
| cryptography | 42.0.8 | 7 |
| pypdf | 4.3.1 | 41 |
| pillow | 11.3.0 | 18 |

El JSON completo, incluidas versiones de corrección sugeridas por la fuente, está en [pip-audit-backend-2026-09-13.json](pip-audit-backend-2026-09-13.json). El conteo suma identificadores devueltos por la herramienta; no se interpreta como 109 rutas explotables ni reemplaza análisis de alcance.

La primera repetición de `python backend/manage.py test --noinput` desde la raíz descubrió por accidente `test_ml_service.py` y falló porque el entorno backend no contiene OpenCV. Se corrigió el comando canónico y CI a `python backend/manage.py test api --noinput`, que delimita la suite Django real. La [salida inicial](backend-verification-initial-2026-09-13.txt) y la [repetición corregida](backend-verification-2026-09-13.txt) conservan la trazabilidad. Con la configuración SQLite temporal: Django check y deriva de migraciones pasaron; la suite `api` terminó con código 0, pero descubrió **cero pruebas**.

## ML

La auditoría completa de `ml/requirements.txt` no pudo resolver el entorno con Python 3.12 porque `torch==2.1.0` no publica una distribución compatible para ese intérprete. El repositorio declara Python 3.11 para CI, por lo que este fallo **no demuestra** incompatibilidad con el runtime objetivo. Sí demuestra que el procedimiento de auditoría no está fijado a un entorno reproducible.

Además, 10 de los 15 requisitos ML no fijan versión: `pandas`, `scikit-learn`, `xgboost`, `fastapi`, `uvicorn`, `joblib`, `httpx`, `python-multipart`, `pyarrow` y `onnxruntime`. No existe lock transitivo ML. La salida normalizada del intento está en [pip-audit-ml-2026-09-13.json](pip-audit-ml-2026-09-13.json).

## Tratamiento requerido

| ID | Tipo | Trabajo | Evidencia de cierre | Propietario sugerido |
| --- | --- | --- | --- | --- |
| DEP-FE | code | Actualizar dependencias frontend vulnerables en PR exclusivo | audit sin crítico/alto aceptado, tipos, lint, build y pruebas | frontend + seguridad |
| DEP-BE | code | Actualizar paquetes backend afectados en PR exclusivo | lock/resolución, pip-audit, check, migraciones y pruebas negativas auth | backend + seguridad |
| DEP-ML | operations/code | Fijar Python 3.11, índices, versiones y lock ML; luego auditar | instalación limpia, lock con hashes y auditoría reproducible | ML + plataforma |
| DEP-AUTO | operations | Definir periodicidad y responsable de actualización | política versionada y issue periódico | repository admin |

Estos trabajos requieren cambios de dependencias o decisiones de mantenimiento y quedaron fuera de la tarea G0, que prohíbe modificar funcionalidad productiva. Bajo el criterio actual “dependencias actualizadas”, la evidencia obtenida es bloqueante.
