# Ruta de mitigación y revisión

1. **Bloquear promoción.** Mantener modelo, paneles e intervenciones sin habilitación basada en el reporte afectado.
2. **Preservar evidencia.** Registrar hashes, configuración, código y motivos del gate sin copiar datos protegidos.
3. **Revisar denominadores.** Confirmar participantes, positivos, negativos, cobertura, `no_observable` y patrón de faltantes por celda autorizada.
4. **Revisar privacidad.** El aprobador independiente verifica que ninguna combinación suprimida pueda reconstruirse desde otras publicaciones.
5. **Determinar alcance.** Distinguir degradación técnica, error de medición, falta de cobertura y muestra insuficiente; no atribuir causas a partir de la brecha.
6. **Corregir sin trato automático por grupo.** Mejorar captura, calidad, representación o modelo global. Un umbral específico requiere una decisión nueva de seguridad, legalidad y equidad; el análisis exploratorio de PR34 no lo autoriza.
7. **Repetir auditoría.** Usar una nueva versión sellada y revisión independiente. No reemplazar el reporte anterior ni seleccionar retrospectivamente el umbral con mejores brechas.
8. **Decidir el gate.** Solo una revisión humana autorizada puede aceptar la evidencia y continuar hacia G5.

Si no puede reunirse evidencia suficiente para una celda, el alcance del despliegue se restringe. La conclusión permitida es “evidencia insuficiente”, nunca “no existe sesgo”.
