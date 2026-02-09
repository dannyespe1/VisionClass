# Diagnóstico de Problemas con la Cámara

## Estado "Sin Rostro" - Guía de Solución

Si la cámara está mostrando "Sin rostro" continuamente, sigue estos pasos para diagnosticar:

### 1. Verificar que el ML Service está corriendo

#### En desarrollo local:

```bash
# Terminal 1: Inicia el ML Service
cd ml
pip install -r requirements.txt
python ml_service.py
# Deberías ver: "Uvicorn running on http://0.0.0.0:9000"
```

#### Verificar que responde:

```bash
# Terminal separada
curl -X GET http://localhost:9000/docs
# Deberías recibir HTML de la documentación FastAPI
```

### 2. Verificar las variables de entorno

#### Frontend (.env.local):

```bash
cat frontend/.env.local
```

**Debe tener:**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ML_SERVICE_URL=http://localhost:9000
NEXT_PUBLIC_ML_URL=http://localhost:9000
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=...
```

Si falta `ML_SERVICE_URL`, agrégalo:

```bash
echo "ML_SERVICE_URL=http://localhost:9000" >> frontend/.env.local
```

#### Backend:

```bash
cat backend/.env
```

**Debe tener (mínimo):**
```
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Verificar conexión Frontend → Proxy → ML Service

#### En el navegador, abre DevTools (F12) y ve a la pestaña Console:

**Deberías ver logs como:**

```
✅ ML Service disponible
[attention-proxy] ✅ Enviando frame a ML Service
[attention-proxy] ✅ Frame procesado correctamente
```

**Si ves:**

```
❌ ML Service timeout - El servicio puede no estar disponible
```

Significa que el proxy no puede alcanzar `http://localhost:9000`

#### Verifica el endpoint del proxy:

```javascript
// En la consola del navegador
fetch('/api/attention-proxy', { method: 'GET' })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
```

**Debería retornar:**
```json
{
  "ok": true,
  "service_url": "http://localhost:9000",
  "message": "ML Service is available"
}
```

### 4. Verificar MediaPipe en el ML Service

#### El ML Service usa MediaPipe para detectar rostros. Si no está instalado:

```bash
cd ml
pip install mediapipe
python -c "import mediapipe; print('✅ MediaPipe OK')"
```

#### Checkear si MediaPipe se cargó correctamente:

```bash
cd ml
python ml_service.py
# Busca en los logs: "face_mesh = ..." debe existir sin errores
```

Si ves en los logs del ML Service:
```
[analyze/frame] session=..., face=False, frame_score=None
```

Significa que MediaPipe **no detecta rostro**, que puede ser por:
- Mala iluminación
- Distancia incorrecta de la cámara
- Rostro fuera de frame
- Ángulo de rostro muy inclinado

### 5. Probar con un request directo al ML Service

Tu una imagen simple para verificar:

```bash
# Crear una imagen de prueba
python -c "
import cv2
import numpy as np
cap = cv2.VideoCapture(0)  # 0 = cámara web
ret, frame = cap.read()
if ret:
    cv2.imwrite('test_frame.jpg', frame)
    print('✅ Imagen capturada: test_frame.jpg')
cap.release()
"

# Enviar al ML Service
curl -X POST "http://localhost:9000/analyze/frame" \
  -F "file=@test_frame.jpg" \
  -F "session_id=1" \
  -F "user_id=1" \
  -F "test_name=COURSE"
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "score": {...},
  "frame_score": {
    "value": 0.75,
    "label": "attention_score",
    "data": {
      "face": true,
      "bbox": [...],
      "eye_ratio": ...,
      ...
    }
  }
}
```

**Si face=false:**

El issue es que MediaPipe no detecta rostro. Intenta:
- Mejor iluminación
- Posiciona la cabeza hacia la cámara
- Acércate más a la cámara
- Quítate objetos que bloqueen el rostro

### 6. Verificar permisos de cámara

En el navegador, ve a **Configuración del sitio** (icono ⓘ en la URL):

- ✅ Cámara: Permitida (green checkmark)
- Si no está permitida, haz click y selecciona "Permitir"

### 7. Logs en tiempo real

#### Terminal de Backend (Django):

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
# Busca: [api] ✅ User authenticated
```

#### Terminal de Frontend (Next.js):

```bash
cd frontend
npm run dev
# Busca: [attention-proxy]  logs
```

#### Terminal de ML Service (FastAPI):

```bash
cd ml
python ml_service.py
# Busca: [analyze/frame] session=..., face=...
```

### 8. Checklist Rápido

- [ ] ML Service corriendo (http://localhost:9000/docs debe responder)
- [ ] Backend corriendo (http://localhost:8000/api/me/ debe responder)
- [ ] Frontend corriendo (http://localhost:3000 debe cargar)
- [ ] Variables de entorno configuradas (ML_SERVICE_URL, etc.)
- [ ] Permisos de cámara concedidos en el navegador
- [ ] MediaPipe importa correctamente en el ML Service
- [ ] Cambiar iluminación / ángulo si MediaPipe no detecta rostro
- [ ] Console del navegador limpia sin errores CORS

### 9. Si aún así falla

#### Ejecutar diagnóstico completo:

```bash
# Crear un script de test
cat > test_attention.py << 'EOF'
import requests
import cv2
import numpy as np

print("=== TEST DE SISTEMA DE ATENCIÓN ===\n")

# 1. Verificar ML Service
print("[1] Verificando ML Service...")
try:
    r = requests.get("http://localhost:9000/docs", timeout=2)
    print("✅ ML Service respondiendo")
except:
    print("❌ ML Service NO respondiendo en http://localhost:9000")

# 2. Verificar Backend
print("\n[2] Verificando Backend...")
try:
    r = requests.get("http://localhost:8000/api/users/", timeout=2)
    print("✅ Backend respondiendo")
except:
    print("❌ Backend NO respondiendo en http://localhost:8000")

# 3. Verificar cámara
print("\n[3] Probando cámara...")
cap = cv2.VideoCapture(0)
if cap.isOpened():
    ret, frame = cap.read()
    if ret:
        print(f"✅ Cámara funcionando ({frame.shape})")
        cv2.imwrite('test.jpg', frame)
        
        # 4. Enviar a ML Service
        print("\n[4] Enviando frame a ML Service...")
        try:
            files = {'file': ('test.jpg', open('test.jpg', 'rb'), 'image/jpeg')}
            data = {'session_id': 1, 'user_id': 1, 'test_name': 'COURSE'}
            r = requests.post("http://localhost:9000/analyze/frame", files=files, data=data, timeout=5)
            resp = r.json()
            has_face = resp.get('frame_score', {}).get('data', {}).get('face', False)
            print(f"{'✅' if has_face else '❌'} ML detectó rostro: {has_face}")
        except Exception as e:
            print(f"❌ Error enviando a ML: {e}")
    else:
        print("❌ Cámara no capturando frames")
    cap.release()
else:
    print("❌ Cámara no disponible")

print("\n=== FIN DEL TEST ===")
EOF

python test_attention.py
```

---

## Resumen

Si ves **"Sin rostro"**:

1. **Verifica que ML Service está corriendo** en `http://localhost:9000`
2. **Verifica variables de entorno**, especialmente `ML_SERVICE_URL`
3. **Abre DevTools (F12)** y mira los logs en Console
4. **Mejora iluminación** y ángulo de la cámara
5. **Concede permisos** de cámara si el navegador los pide
6. **Reinicia los servicios** si nada funciona

**Logs clave a buscar:**

✅ Success: `[attention-proxy] ✅ Frame procesado correctamente`  
❌ Error: `[attention-proxy] ❌ ML Service error`  
⚠️ Warning: `[attention-proxy/health] ❌ ML Service no responde`
