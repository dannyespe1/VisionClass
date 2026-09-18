# Checklist del candidato PR40

## Gates y configuración

- [x] G6 aprobado sólo para ingeniería del candidato.
- [x] `pilot_release=false` en backend, frontend, Compose, Render y manifiesto.
- [x] PR35–PR38 apagados y subordinados al interruptor global.
- [x] Entrenamiento al inicio apagado.
- [x] Sin datos reales, credenciales, nombres de participantes ni contactos personales.
- [ ] Aprobación separada para activar piloto.

## Seguridad y privacidad

- [x] Dependencias de producción: cero vulnerabilidades en `npm audit`.
- [x] Auditoría completa npm: cero vulnerabilidades después de actualización compatible.
- [x] Consentimiento y borrado cubiertos por regresión backend.
- [x] Exportación de investigación permanece apagada y protegida por permisos.
- [x] Telemetría operacional excluye payload, query, usuario e IP.
- [ ] Roster, contactos y protocolo institucional aprobados antes de incorporar personas.

## Validez y equidad

- [x] Artefacto temporal clasificado `engineering_parity_only`, inactivo y sin intervenciones.
- [x] `unknown`/`no_observable` y fallbacks seguros conservados.
- [x] Paneles e intervenciones sin revisiones humanas permanecen excluidos.
- [ ] No realizar afirmaciones científicas, de validez o equidad durante el ensayo técnico.

## Rendimiento, restauración y reversión

- [x] SLO aprobados: disponibilidad 99%, mantenimiento dentro de 432 minutos/30 días.
- [x] Carga objetivo y pico PR39 sin errores en el entorno aislado.
- [x] Backup/restauración sintética con integridad coincidente.
- [x] Fallos de instancia, Redis, base y ML recuperados bajo el objetivo aprobado.
- [ ] Ejecutar soak y rollback sobre la infraestructura candidata antes de activación.
