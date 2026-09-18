# Triage de dependencias PR40

La línea base tenía 17 vulnerabilidades npm, incluida una crítica en Next.js. PR40 actualizó Next.js a 16.3.5, Axios a 1.18.0 y las herramientas relacionadas mediante actualizaciones compatibles y `npm audit fix` sin `--force`.

Resultado del candidato:

- `npm audit`: 0 vulnerabilidades;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- lockfile versionado y congelado en el manifiesto;
- build, tipos y suite completa deben repetirse después de la actualización.

No se acepta ninguna vulnerabilidad crítica. Un nuevo hallazgo crítico vuelve el candidato a `BLOCKED` y obliga a regenerar la evidencia.
