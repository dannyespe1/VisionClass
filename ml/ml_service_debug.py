"""
Script para debuggear por qué face detection no funciona
Ejecutar: python ml/ml_service_debug.py
"""
import cv2
import numpy as np
import mediapipe as mp
import os

print("=" * 70)
print("DIAGNÓSTICO DE MEDIAPIPE Y DETECCIÓN DE ROSTROS")
print("=" * 70)

# Test 1: ¿Se importó MediaPipe?
try:
    mp_face_mesh = mp.solutions.face_mesh
    print("✅ MediaPipe importado correctamente")
except Exception as e:
    print(f"❌ Error importando MediaPipe: {e}")
    exit(1)

# Test 2: ¿Se inicializa FaceMesh?
try:
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    print("✅ FaceMesh inicializado correctamente")
except Exception as e:
    print(f"❌ Error inicializando FaceMesh: {e}")
    exit(1)

# Test 3: Probar con imagen local si existe
test_images = [
    "test_frame.jpg",
    "test_face.jpg",
    "/tmp/test_frame.jpg",
    "data/frames/test.jpg"
]

for img_path in test_images:
    if os.path.exists(img_path):
        print(f"\n📷 Probando con imagen: {img_path}")
        img = cv2.imread(img_path)
        if img is not None:
            print(f"   Forma: {img.shape}, rango: [{img.min()},{img.max()}]")
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            result = face_mesh.process(rgb)
            if result.multi_face_landmarks:
                print(f"   ✅ Rostro DETECTADO: {len(result.multi_face_landmarks)} cara(s)")
            else:
                print(f"   ❌ NO se detectó rostro")
        break

# Test 4: Crear imagen de prueba con contenido mínimo
print("\n📸 Creando imagen de prueba con contenido...")
test_img = np.zeros((480, 640, 3), dtype=np.uint8)
test_img[100:400, 150:550] = 128  # Rectángulo gris
test_img[150:300, 200:500, 2] = 255  # Canal rojo (piel)

print(f"   Forma: {test_img.shape}, rango: [{test_img.min()},{test_img.max()}]")
rgb = cv2.cvtColor(test_img, cv2.COLOR_BGR2RGB)
result = face_mesh.process(rgb)
if result.multi_face_landmarks:
    print(f"   ✅ Rostro DETECTADO en imagen sintética")
else:
    print(f"   ❌ NO se detectó rostro en imagen sintética")

# Test 5: Verificar formato de entrada esperado
print("\n📊 Información de configuración:")
print(f"   BACKEND_URL: {os.environ.get('BACKEND_URL', 'default')}")
print(f"   SEQUENCE_LENGTH: {os.environ.get('SEQUENCE_LENGTH', '16')}")
print(f"   MODEL_PATH: {os.environ.get('MODEL_PATH', 'checkpoints/cnn_lstm.onnx')}")
print(f"   ML_SERVICE_URL: {os.environ.get('ML_SERVICE_URL', 'http://localhost:9000')}")

print("\n" + "=" * 70)
print("FIN DEL DIAGNÓSTICO")
print("=" * 70)
