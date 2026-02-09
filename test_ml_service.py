#!/usr/bin/env python3
"""
Prueba simple del endpoint /analyze/frame sin usar el frontend
Envía una imagen de prueba al ML Service
"""
import requests
import cv2
import numpy as np
import sys
from io import BytesIO

ML_SERVICE_URL = "https://visionclass-ml.onrender.com"
SESSION_ID = 1
USER_ID = 1

print("=" * 70)
print("TEST SIMPLE DEL ENDPOINT /analyze/frame")
print("=" * 70)
print(f"ML Service: {ML_SERVICE_URL}")
print(f"Session: {SESSION_ID}, User: {USER_ID}")

# Crear imagen de prueba con contenido
print("\n1️⃣  Creando imagen de prueba...")
test_img = np.ones((480, 640, 3), dtype=np.uint8) * 100  # Gris medio
# Agregar un rectángulo "piel" más claro
test_img[150:350, 200:500, :] = [200, 160, 140]  # BGR para piel aproximada
test_img[150:200, 250:450] = [220, 180, 160]  # Frente
test_img[200:250, 280:420] = [210, 170, 150]  # Ojos
test_img[180:200, 300:330] = [100, 50, 40]    # Ojo izquierdo
test_img[180:200, 370:400] = [100, 50, 40]    # Ojo derecho

print(f"   ✅ Imagen creada: shape={test_img.shape}, min={test_img.min()}, max={test_img.max()}")

# Guardar imagen para inspección
test_img_bgr = cv2.cvtColor(test_img.astype(np.uint8), cv2.COLOR_RGB2BGR)
cv2.imwrite("ml/test_image_sent.jpg", test_img_bgr)
print(f"   📁 Guardada en: ml/test_image_sent.jpg")

# Codificar a JPEG
_, img_encoded = cv2.imencode('.jpg', test_img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
print(f"\n2️⃣  Codificando JPEG... {len(img_encoded)} bytes")

# Preparar request
files = {
    'file': ('frame.jpg', BytesIO(img_encoded.tobytes()), 'image/jpeg')
}
data = {
    'session_id': SESSION_ID,
    'user_id': USER_ID,
    'phase': 0,
    'time_left': 60,
    'spinning': 0,
    'test_name': 'COURSE'
}

print(f"\n3️⃣  Enviando POST a {ML_SERVICE_URL}/analyze/frame...")
try:
    resp = requests.post(f"{ML_SERVICE_URL}/analyze/frame", files=files, data=data, timeout=10)
    print(f"   Status: {resp.status_code}")
    print(f"   Response:")
    print(f"   {resp.json()}")
except requests.exceptions.RequestException as e:
    print(f"   ❌ Error: {e}")
    sys.exit(1)

print("\n4️⃣  Verificando ML Service health...")
try:
    health = requests.get(f"{ML_SERVICE_URL}/health", timeout=5)
    print(f"   Status: {health.status_code}")
    print(f"   {health.json()}")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n5️⃣  Verificando MediaPipe status...")
try:
    status = requests.get(f"{ML_SERVICE_URL}/debug/status", timeout=5)
    if status.status_code == 200:
        print(f"   {status.json()}")
    else:
        print(f"   ⚠️  /debug/status no disponible (crear en ml_service.py)")
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "=" * 70)
print("FIN DEL TEST")
print("=" * 70)
