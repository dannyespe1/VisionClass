# PR40 — Candidato de piloto

## Estado

`visionclass-pilot-0.40.0-rc.1` está preparado, no desplegado y no autorizado para activación. G6 permite únicamente ingeniería del candidato. `PILOT_RELEASE` y `NEXT_PUBLIC_PILOT_RELEASE` permanecen apagados y son una condición adicional para PR35–PR38.

El manifiesto `release/pilot-candidate/candidate.json` congela runtimes, lockfiles, migraciones, configuraciones de modelos y flags. `scripts/verify_pr40_candidate.py` falla si alguno cambia sin actualizar deliberadamente el candidato.

## Alcance del ensayo

El recorrido usa sólo cuentas y datos sintéticos: un administrador, un docente, dos estudiantes y un investigador. Comprueba autenticación, consentimiento, recorrido académico base, revocación/borrado, alertas operativas y exportación protegida sin habilitar los módulos pendientes.

No existe una nómina de participantes reales en este candidato. Incorporar personas, desplegar o cambiar `pilot_release` requiere una decisión posterior distinta de G6.

## Comprobación

```powershell
python scripts/verify_pr40_candidate.py
docker compose -p visionclass-pr40-rehearsal -f ops/pr39/docker-compose.drill.yml -f ops/pr40/candidate.override.yml up -d --wait
docker compose -p visionclass-pr40-rehearsal -f ops/pr39/docker-compose.drill.yml -f ops/pr40/candidate.override.yml down -v
```

El segundo comando sólo crea un entorno efímero local. El rollback elimina exclusivamente el proyecto `visionclass-pr40-rehearsal` y su volumen sintético.
