# 🔍 ANÁLISIS Y SOLUCIÓN: Por Qué Face Detection NO Funciona

## 📊 Diagnóstico de los Logs

### Lo que vemos en los logs:

```
ML Service:  [analyze/frame] session=19, face=False, frame_score=None, temporal=0.00
Frontend:    [attention-proxy] hasFace: false, score: null
Backend:     ✅ Requests llegando correctamente
```

## 🎯 El Problema: MediaPipe NUNCA detecta rostros

### Causas Posibles (en orden de probabilidad):

1. **❌ Las imágenes que llegan al ML Service son negras o vacías**
   - Rango [0,0] en lugar de [0,255]
   - Imagen totalmente oscura
   - Buffer vacío

2. **❌ MediaPipe NOT está inicializado correctamente**
   - `face_mesh = None` en el startup
   - Error en dependencies de MediaPipe en contenedor

3. **❌ Problema con la captura de video del lado del cliente**
   - Canvas no tiene contenido
   - Frame no se está codificando correctamente
   - Tamaño demasiado pequeño

4. **❌ Lighting/Ángulo insuficiente**
   - Muy oscuro para detectar
   - Ángulo muy extreme

## 🛠️ Solución - Pasos Inmediatos

### PASO 1: Agregar Logging Detallado al ML Service

```python
# En ml/ml_service.py - REEMPLAZAR esta sección:

if not result.multi_face_landmarks:
    img_min = int(image.min())
    img_max = int(image.max())
    img_mean = int(image.mean())
    print(f"[compute_attention_score] ⚠️  NO DETECTADO")
    print(f"   shape={image.shape}")
    print(f"   range=[{img_min},{img_max}]")
    print(f"   mean={img_mean}")
    print(f"   face_mesh_init={face_mesh is not None}")
    return {"value": None, "label": "no_face", "data": {"face": False}}
```

### PASO 2: Agregar Endpoint de Debug al ML Service

```python
@app.get("/debug/status")
async def debug_status():
    """Verifica si MediaPipe está inicializado"""
    return {
        "mediapipe_alive": face_mesh is not None,
        "message": "ready" if face_mesh else "⚠️ MediaPipe NOT initialized"
    }
```

### PASO 3: Verificar Frontend - Validar Frame que se envía

En `frontend/app/api/attention-proxy/route.ts`, agregar:

```typescript
// Después de capturar frame del canvas
const canvasImage = canvas.toDataURL("image/jpeg", 0.8);
if (!canvasImage || canvasImage === "data:image/jpeg;base64,") {
  console.error("[proxy] ❌ Canvas NO contiene contenido!");
  return NextResponse.json({ error: "Canvas is empty" }, { status: 400 });
}
```

## 📝 Pasos de Testing en Orden

### Test 1: ¿Está MediaPipe inicializado?

```bash
# Request a Render ML Service
curl -X GET "https://visionclass-ml.onrender.com/debug/status"
# Esperado: { "mediapipe_alive": true }
# Si es false, MediaPipe NO inicializó correctamente
```

### Test 2: Enviar una imagen simple de prueba

```bash
# Crear imagen de prueba (480x640, con contenido)
python test_ml_service.py
# Ver logs en Render ML Service

# Los logs deberían mostrar:
# ✅ Shape, rango and content
# ❌ Pero face_mesh sigue siendo False = MediaPipe issue
```

### Test 3: Revisar Canvas del Frontend

```javascript
// En browser console cuando está capturando:
const canvas = document.querySelector("canvas");
console.log("Canvas size:", canvas.width, canvas.height);
console.log("Canvas empty?", canvas.toDataURL() === "data:image/jpeg;base64,");
```

## 🚨 Root Cause Probables

### Escenario A: MediaPipe No inicializó (85%)

**Síntoma**: `/debug/status` devuelve `mediapipe_alive: false`
**Causa**:

- Python package `mediapipe` no instaló correctamente en Render container
- Dependencias faltantes (por ej: protobuf, numpy versión incompatible)

**Solución**:

1. Verificar `ml/requirements.txt` tiene `mediapipe>=0.9.0`
2. Forzar reinstalación en Render:
   - Ir a Render Dashboard → visionclass-ml service
   - Trigger manual deploy
   - Revisar logs de build para errores de `pip install`

### Escenario B: Canvas está vacío (10%)

**Síntoma**: Canvas captura video pero array es [0,0,0,...]
**Causa**:

- Video stream no started
- CORS blocking canvas
- getUserMedia falla silenciosamente

**Solución**:

- En browser console: `document.querySelector('video').readyState === 2` (playing?)
- Verificar permisos de cámara concedidos
- Ver logs de `requestCamera()` en frontend

### Escenario C: Imagen muy pequeña o mal formateada (5%)

**Síntoma**: Logs muestran shape [1,1,3] o [10,10,3]
**Causa**:

- Canvas size set to 1x1 por error
- Frame buffer overflow

**Solución**:

- Verificar `<canvas width="640" height="480">`
- Logs frontendmostrarían canvas dimensions

## 📋 Checklist Depuración

- [ ] PASO 1: Redeployar ML Service con logs mejorados
- [ ] PASO 2: Revisar logs en Render ML durante test
- [ ] PASO 3: Run `test_ml_service.py` localmente
- [ ] PASO 4: Verificar `/debug/status` en producción
- [ ] PASO 5: Revisar logs de MediaPipe en build
- [ ] PASO 6: Test video capture en browser

## 📲 Próximos Pasos

1. **Ahora**: Hacer push de cambios (logs mejorados + scripts de test)
2. **Luego**: Que usuario reinstancia student course en Render
3. **Monitor**: Revisar logs ML Service - buscar:
   - "✅ DETECTADO" (éxito)
   - "⚠️ NO DETECTADO shape/range/mean" (ver qué envía)
   - "face_mesh_init=False" (MediaPipe NO inicializó)
4. **Si MediaPipe=False**: Revisar build logs de Render ML para errores pip

## 🔗 Files Afectados

- `ml/ml_service.py` - Agregar logs detallados + `/debug/status`
- `ml/ml_service_debug.py` - Script local para test
- `test_ml_service.py` - Test simple sin frontend
- `frontend/app/api/attention-proxy/route.ts` - Validar frame antes de enviar

---

**TL;DR**: Las imágenes NUNCA contienen rostros en el ML Service. La causa es casi seguramente que MediaPipe NO se inicializó correctamente en Render, o el Canvas está vacío. El próximo redeployment con logs mejorados responderá la pregunta.
