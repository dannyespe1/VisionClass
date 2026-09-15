# PR06 — Pruebas y observabilidad mínima

Se incorporan endpoints públicos diferenciados de vida (`/api/health/live/`) y preparación (`/api/health/ready/`). La preparación valida conectividad de base de datos y responde 503 ante fallo. Ambos endpoints propagan o generan `correlation_id` sin incluir PII.

La ejecución completa de lint/typecheck/build queda condicionada a disponer de los runtimes objetivo (Python 3.11 y Node 20) en CI.
