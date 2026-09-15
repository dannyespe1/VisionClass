# Runbook de rotación y revocación ML

Se administran dos pares independientes: `ML_BFF_SERVICE_TOKEN`/`BFF_SERVICE_TOKEN` para BFF→ML y `ML_BACKEND_SERVICE_TOKEN`/`ML_SERVICE_TOKEN` para ML→Django. Cada valor debe ser aleatorio, de al menos 32 caracteres, distinto entre enlaces y almacenado solo en el gestor de secretos.

## Rotación sin interrupción

1. Generar un valor nuevo en el gestor, sin imprimirlo ni copiarlo a archivos del repositorio.
2. En el receptor, mover el valor actual al slot `*_PREVIOUS_*`, instalar el nuevo en el slot actual y desplegar.
3. Verificar con una solicitud sintética que los slots actual y anterior son aceptados solo para el scope esperado.
4. Actualizar el emisor para usar el nuevo valor y desplegar.
5. Confirmar que solo el slot actual recibe uso; esperar como máximo la ventana operativa aprobada.
6. Vaciar el slot anterior en el receptor y comprobar que el valor anterior devuelve 401.
7. Registrar propietario, fecha, servicios, resultado y referencia del secreto; nunca el valor.

## Revocación urgente

Retirar de inmediato el valor comprometido. Si era el actual, promover un valor nuevo directamente y desactivar temporalmente el procesamiento hasta que ambos lados coincidan. No usar JWT administrativos, cuentas humanas ni un token común para los dos enlaces como contingencia.

## Rollback seguro

Si el emisor no puede adoptar el nuevo valor, conservar el anterior únicamente durante la ventana aprobada y desactivar ML si vence. El rollback permitido es suspender procesamiento; nunca restaurar privilegios amplios.

