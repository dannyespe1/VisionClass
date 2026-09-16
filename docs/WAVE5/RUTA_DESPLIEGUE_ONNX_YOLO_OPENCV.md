# Ruta de despliegue ONNX + YOLO/OpenCV

**Estado:** decisión arquitectónica aprobada; implementación diferida hasta contar con G3 y evaluación comparativa.  
**Alcance actual:** MediaPipe Tasks Vision 1.0.1 funciona como fallback local del navegador. El modelo y WASM se sirven desde el mismo origen y ninguna imagen se transmite durante la ejecución.

## Objetivo

Para despliegues administrados o de mayor exigencia, evaluar un backend local basado en ONNX Runtime junto con OpenCV y un detector YOLO adecuado. Esta ruta no reemplazará automáticamente MediaPipe: deberá demostrar paridad, desempeño, consumo y compatibilidad bajo el mismo contrato de características derivadas.

## Contrato obligatorio

- Entrada de imagen únicamente en memoria local; queda prohibido enviar frames o imágenes a servicios externos.
- Salida limitada al contrato versionado de características derivadas, calidad y `no_observable`.
- Artefactos de modelo versionados y verificados con SHA-256 publicado por el proyecto.
- Preprocesamiento, resolución, normalización, etiquetas y posprocesamiento congelados y reproducibles.
- CPU como baseline obligatorio; aceleración opcional con fallback seguro y sin cambiar silenciosamente resultados.
- Licencias del modelo, dataset y runtime revisadas antes de incorporar artefactos.
- Shadow mode, rollback y flags independientes; ninguna salida activa decisiones educativas.

## Comparación requerida

La decisión entre MediaPipe y ONNX/YOLO/OpenCV debe medirse con la matriz Edge y, tras G3, con datos autorizados. Se compararán cobertura observable, fallos por plataforma, latencia p50/p95, memoria, CPU, energía, estabilidad prolongada, sensibilidad a iluminación/oclusión, paridad de características y tamaño del artefacto. No se elegirá un motor solo por precisión nominal.

## Orden propuesto

1. Definir el modelo YOLO, licencia y formato ONNX exactos.
2. Crear adaptador detrás de la misma interfaz `detect()` y del mismo esquema de salida.
3. Añadir fixtures sintéticos y pruebas negativas de red.
4. Ejecutar benchmark local reproducible en CPU y aceleradores permitidos.
5. Comparar contra MediaPipe sin mezclar motores dentro de una sesión.
6. Someter el cambio de motor a revisión independiente antes de habilitarlo.

La autorización recibida permite diseñar esta ruta; no autoriza entrenamiento, evaluación con participantes ni apertura de G3.
