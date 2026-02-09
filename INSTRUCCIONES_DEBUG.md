# 🔧 INSTRUCCIONES PARA DEBUGGEAR Y SOLUCIONAR FACE DETECTION

## 📊 Resumen del Problema

Los logs muestran:
- ✅ Frontend envía frames al ML Service correctamente
- ✅ ML Service recibe las solicitudes
- ❌ **PERO nunca detecta rostros** (`face=False` SIEMPRE)

**Root cause probable**: MediaPipe FaceMesh no se inicializó correctamente en Render, O las imágenes que llegan están vacías/negras.

---

## 🎯 Próximos Pasos - Qué Hacer Ahora

### PASO 1: Esperar Redeployment de Render
El ML Service se está redeploys ahora con logging mejorado.
- **Tiempo**: ~3-5 minutos
- Ver status en: https://dashboard.render.com (visionclass-ml service)

### PASO 2: Una vez deployed, Abre la Consola de Render
En Render Dashboard:
1. Click `visionclass-ml` service
2. Click `Logs` tab
3. Busca líneas que digan:

```
✅ [INIT] MediaPipe FaceMesh initialized successfully
```

**O**

```
⚠️  [INIT] MediaPipe FaceMesh initialization FAILED
```

**Si ves FAILED**: El problema es que MediaPipe no se puede instalar en Render. Ver SOLUCIÓN A abajo.

### PASO 3: Test Frame Capture
Una vez deployed, una persona abre la app en Render:
1. Login como student
2. Entra a lesson con cámara
3. Permite permisos de cámara
4. Espera 5 segundos grabando

**En Render logs ML Service, debería ver**:

Opción A (SUCCESS):
```
[analyze_frame] 📥 Frame recibido: XXXX bytes
[analyze_frame] ✅ Decodificado OK: forma=(480, 640, 3)
[compute_attention] ✅ ROSTRO DETECTADO!
```

Opción B (Canvas vacío):
```
[analyze_frame] 📥 Frame recibido: 500 bytes
[analyze_frame] ✅ Decodificado OK: forma=(480, 640, 3)
[compute_attention] ⚠️  NO DETECTADO shape=(480, 640, 3) range=[0,0]
```
→ Si ves range=[0,0], **Canvas está dark/empty**

Opción C (MediaPipe no inicializó):
```
[analyze_frame] 📥 Frame recibido: 2000 bytes
[compute_attention] ⚠️  face_mesh_init=False
```
→ Ver SOLUCIÓN A

---

## 🚨 SOLUCIONES POR ESCENARIO

### SOLUCIÓN A: MediaPipe No Inicializó (face_mesh=None)

**Síntoma**: Logs muestran `face_mesh_init=False` o error "FaceMesh initialization FAILED"

**Root Cause**: 
- Package `mediapipe` no instaló en Render
- O versión de Python incompatible
- O falta dependencia (protobuf, etc)

**Fix**:

1. **Revisar `ml/requirements.txt`**:
   ```bash
   cat ml/requirements.txt | grep mediapipe
   ```
   Debería mostrar: `mediapipe>=0.9.0`

2. **Si NO está, agregarlo**:
   ```bash
   echo "mediapipe>=0.9.0" >> ml/requirements.txt
   ```

3. **Si YA está, fuerza rebuild**:
   - Render Dashboard → visionclass-ml
   - Click dropdown menu top-right
   - Select "Trigger deploy"
   - Espera deploy, revisar logs para errores pip

4. **Si sigue fallando**, agregar requirements más específicos:
   ```
   mediapipe==0.10.0
   numpy<2.0
   opencv-python==4.8.1.78
   protobuf==3.20.0
   ```

---

### SOLUCIÓN B: Canvas Está Vacío (range=[0,0])

**Síntoma**: Frames llegan con range=[0,0], shape OK pero sin contenido

**Root Cause**:
- Video stream no está playing
- Canvas size 0x0
- getUserMedia() falló silenciosamente

**Fix**:

En `frontend/app/student/course/[courseId]/page.tsx`, en la función `requestCamera()`:

```typescript
async function requestCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (!videoRef.current) return;
    
    videoRef.current.srcObject = stream;
    
    // DEBUG: Esperar que el video esté listo
    await new Promise(resolve => {
      videoRef.current!.onloadedmetadata = () => {
        console.log('✅ Video metadata loaded');
        console.log('   Video size:', videoRef.current!.videoWidth, 'x', videoRef.current!.videoHeight);
        videoRef.current!.play().then(() => {
          console.log('✅ Video is now playing');
          resolve(null);
        });
      };
    });
    
    // Verificar canvas está ok
    const canvas = canvasRef.current;
    if (canvas.width === 0 || canvas.height === 0) {
      console.error('❌ Canvas size is 0! Check canvas element attributes');
      return;
    }
    
    console.log('✅ Canvas size:', canvas.width, 'x', canvas.height);
    cameraActiveRef.current = true;
    
  } catch (e) {
    console.error('❌ getUserMedia failed:', e);
  }
}
```

Esto logará cuando:
- Video actually está playing
- Canvas tiene tamaño correcto  
- Si falla, te dirá por qué

---

### SOLUCIÓN C: Logging Muy Básico (Quiero Ver EXACTAMENTE Qué Envía)

Si necesitas máximo detalle de qué trae el frame:

**En `ml/ml_service.py`, en `/analyze/frame` endpoint**:

```python
content = await file.read()
print(f"[DEBUG] Bytes recibidos: {len(content)}")
np_arr = np.frombuffer(content, np.uint8)
image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

if image is None:
    print(f"[DEBUG] ❌ cv2.imdecode() devolvió None!")
else:
    # Calcular statistics
    img_min, img_max = image.min(), image.max()
    is_empty = (img_max - img_min) < 10
    non_zero_pixels = (image > 10).sum()
    
    print(f"[DEBUG] ✅ Imagen decodificada:")
    print(f"   shape: {image.shape}")
    print(f"   dtype: {image.dtype}")
    print(f"   min: {img_min}, max: {img_max}")
    print(f"   empty?: {is_empty}")
    print(f"   non_zero_pixels: {non_zero_pixels} de {image.size}")
    print(f"   mean: {image.mean():.1f}")
```

Esto te mostrará EXACTAMENTE qué trae el frame.

---

## 📋 Checklist de Debugging

```
[ ] 1. Render redeployó ML Service con nuevos logs
[ ] 2. Abre logs de Render ML Service 
[ ] 3. Busca [INIT] - ¿inicializó MediaPipe?
[ ] 4. Un usuario intenta capturar en producción
[ ] 5. Revisa logs ML para ver qué frame llegó:
        - Si range=[0,0] → Canvas vacío (SOLUCIÓN B)
        - Si face_mesh=False → MediaPipe no inicializó (SOLUCIÓN A)
        - Si ✅ pero face=False → MediaPipe no detecta rostro legítimo
          (prueba con imagen mejor iluminada o acerca más)
```

---

## 📞 Test Local (SIN Producción)

Puedes probar localmente si quieres:

```bash
# 1. Start ML Service locally
cd ml
python -m uvicorn ml_service:app --host 0.0.0.0 --port 9000

# 2. En otra terminal, run test
cd ..
python test_ml_service.py

# Ver logs de ML Service - mostrará:
# ✅ [INIT] MediaPipe initialized
# 📥 Frame received: XXXX bytes
# ✅ Decodificado OK: ...
# ... resultado de face detection
```

---

## 🎬 Próximos Pasos

1. **Hoy**: Esperar redeployment de Render (3-5 min)
2. **Cuando esté live**: Usuario intenta capturar en Render
3. **Monitor**: Revisar logs ML Service para:
   - `[INIT]` messages
   - `frame recibido` y `decodificado`
   - `face=False` o `✅ DETECTADO`
4. **Si falla**: Aplicar solución correspondiente (A, B, o C)
5. **Cuando funcione**: Rastrear por cuánto tiempo los rostros se detectan en la API

---

## 💡 Insights Clave

El hecho de que:
- ✅ Backend recibe requests
- ✅ Frontend envía frames
- ❌ Pero NUNCA hay face=True

Significa **definitivamente** uno de estos:
1. MediaPipe = None (no inicializó)
2. image shape / range wrong (frame vacío)
3. imagen demasiado pequeña/ pobre calidad para detectar

YA HEMOS DESCARTADO:
- ✅ Network connectivity (requests llegan)
- ✅ CORS issues (requests procesa)
- ✅ Frontend permissions (video captura)

**El próximo redeployment con logs mejores responderá cuál es.**

---

**Date**: 2026-02-09
**Status**: Debugging phase - Waiting for Render redeployment
