# Checklist de cierre G1

- [ ] G0 tiene acta `PASS` firmada por responsables independientes.
- [ ] El consentimiento y el tratamiento de participantes adultos están aprobados por ética y privacidad.
- [ ] La frontera de captura demuestra que ningún frame crudo sale del dispositivo por defecto.
- [ ] PR01–PR07 están revisados sobre el mismo commit de integración.
- [ ] CI pasa con Python 3.11 y Node.js 20.
- [ ] Backend: `check`, migraciones y pruebas pasan.
- [ ] Frontend: tipos, pruebas y build pasan.
- [ ] El lint pasa o existe excepción aprobada, con responsable y vencimiento, sin aumentar errores.
- [ ] ML compila y pasan las pruebas de identidad y captura.
- [ ] E2E verifica inicio, cancelación, revocación, error, salida y liberación de cámara/buffers.
- [ ] Health live/ready y observabilidad se ejecutaron en un entorno integrado.
- [ ] No hay secretos, PII, frames ni identificadores personales en logs o artefactos.
- [ ] Un aprobador distinto del ejecutor registra decisión y SHA revisado.
