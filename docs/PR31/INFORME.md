# PR31 — Doble anotación ciega

Se incorporan asignaciones opacas por ventana y observador, con manual y estrato de muestreo versionados. Una ventana admite dos observadores distintos; un observador no puede recibirla dos veces ni observar su propia sesión.

La interfaz solo recibe `assignmentId` y nunca predicciones o puntuaciones. `OBSERVER_ANNOTATION=False` permanece apagado. Entrenamiento, piloto de acuerdo y aprobación metodológica/ética siguen pendientes antes de una muestra real.
