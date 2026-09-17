# Aprobación específica de seguridad — PR38

Fecha de confirmación: 2026-09-17  
Fuente: confirmación explícita del propietario en la tarea de Codex  
Estado: `APPROVED_FOR_CONDITIONAL_ENGINEERING`

## Alcance confirmado

Se autoriza exclusivamente la ingeniería de PR38 con datos sintéticos y el feature flag apagado por defecto, bajo estas condiciones:

- sugerencias generales, opcionales, no punitivas y dirigidas únicamente al estudiante;
- seis ventanas observables consecutivas;
- incertidumbre máxima de 0,30;
- enfriamiento mínimo de 10 minutos;
- máximo de dos sugerencias por sesión y cuatro por día;
- exclusión de evaluaciones, `unknown`, `no_observable`, discontinuidades, cambios de perfil y consentimiento o cámara inválidos;
- ninguna notificación docente ni decisión académica;
- ningún LLM clasifica la señal; PR38 usa solamente variantes estáticas aprobadas;
- cada presentación conserva regla, versión, explicación y auditoría minimizada;
- apagado global inmediato para impedir nuevas sugerencias.

La confirmación no autoriza activación en piloto o producción, uso de datos reales, afirmaciones de validez/equidad ni modificación de `allow_intervention=false` en los contratos ML. La revisión independiente externa no fue aportada y permanece `NO EJECUTADA`.
