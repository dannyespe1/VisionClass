#!/usr/bin/env python3
"""
Script de diagnóstico para problemas de cámara en VisionClass
Ejecuta: python diagnose_camera.py
"""

import sys
import os
import requests
import cv2
import json
from pathlib import Path

COLORS = {
    "GREEN": "\033[92m",
    "RED": "\033[91m",
    "YELLOW": "\033[93m",
    "BLUE": "\033[94m",
    "END": "\033[0m",
}

def print_status(message, status="info"):
    icon = {
        "ok": f"{COLORS['GREEN']}✅{COLORS['END']}",
        "error": f"{COLORS['RED']}❌{COLORS['END']}",
        "warning": f"{COLORS['YELLOW']}⚠️ {COLORS['END']}",
        "info": f"{COLORS['BLUE']}ℹ️ {COLORS['END']}",
    }.get(status, "ℹ️")
    print(f"{icon} {message}")


def check_ml_service(ml_url="http://localhost:9000"):
    """Verifica que el ML Service esté corriendo."""
    print("\n--- Verificando ML Service ---")
    try:
        r = requests.get(f"{ml_url}/docs", timeout=2)
        if r.status_code == 200:
            print_status(f"ML Service disponible en {ml_url}", "ok")
            return True
    except requests.exceptions.Timeout:
        print_status(f"Timeout conectando a {ml_url}", "error")
        print_status("¿Está corriendo: python ml_service.py?", "warning")
        return False
    except requests.exceptions.ConnectionError:
        print_status(f"No se puede conectar a {ml_url}", "error")
        print_status("Verifica que el ML Service está corriendo", "warning")
        return False
    except Exception as e:
        print_status(f"Error: {str(e)}", "error")
        return False


def check_backend(backend_url="http://localhost:8000"):
    """Verifica que el Backend esté corriendo."""
    print("\n--- Verificando Backend ---")
    try:
        r = requests.get(f"{backend_url}/api/users/", timeout=2)
        if r.status_code in [200, 401]:  # 401 = sin token
            print_status(f"Backend disponible en {backend_url}", "ok")
            return True
    except requests.exceptions.Timeout:
        print_status(f"Timeout conectando a {backend_url}", "error")
        return False
    except requests.exceptions.ConnectionError:
        print_status(f"No se puede conectar a {backend_url}", "error")
        print_status("¿Está corriendo: python manage.py runserver?", "warning")
        return False
    except Exception as e:
        print_status(f"Error: {str(e)}", "error")
        return False


def check_camera():
    """Verifica que la cámara funciona."""
    print("\n--- Verificando Cámara ---")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print_status("Cámara no disponible", "error")
        return False, None

    try:
        ret, frame = cap.read()
        if ret and frame is not None:
            print_status(f"Cámara funcionando ({frame.shape[1]}x{frame.shape[0]})", "ok")
            # Guardar para pruebas
            cv2.imwrite("test_frame.jpg", frame)
            return True, "test_frame.jpg"
        else:
            print_status("Cámara no capturando frames", "error")
            return False, None
    finally:
        cap.release()


def check_mediapipe():
    """Verifica que MediaPipe está instalado."""
    print("\n--- Verificando MediaPipe ---")
    try:
        import mediapipe as mp
        print_status("MediaPipe instalado correctamente", "ok")
        return True
    except ImportError:
        print_status("MediaPipe NO instalado", "error")
        print_status("Ejecuta: pip install mediapipe", "info")
        return False


def test_ml_frame_detection(ml_url="http://localhost:9000", image_path="test_frame.jpg"):
    """Prueba enviar un frame al ML Service."""
    print("\n--- Probando Detección de Rostro en ML Service ---")

    if not os.path.exists(image_path):
        print_status(f"Imagen {image_path} no existe", "error")
        return None

    try:
        with open(image_path, "rb") as f:
            files = {"file": (image_path, f, "image/jpeg")}
            data = {
                "session_id": 1,
                "user_id": 1,
                "test_name": "DIAGNOSTIC",
            }
            r = requests.post(
                f"{ml_url}/analyze/frame",
                files=files,
                data=data,
                timeout=5,
            )

        if r.status_code != 200:
            print_status(f"ML Service retornó {r.status_code}", "error")
            print_status(f"Respuesta: {r.text[:200]}", "warning")
            return None

        resp = r.json()
        has_face = resp.get("frame_score", {}).get("data", {}).get("face", False)
        score = resp.get("frame_score", {}).get("value")

        if has_face:
            print_status(f"Rostro detectado (score: {score:.2f})", "ok")
        else:
            print_status("NO se detectó rostro", "error")
            print_status("Intenta: mejor iluminación, más cerca a la cámara, de frente", "warning")

        return resp

    except Exception as e:
        print_status(f"Error enviando frame: {str(e)}", "error")
        return None


def check_env_variables():
    """Verifica variables de entorno."""
    print("\n--- Verificando Variables de Entorno ---")

    env_vars = [
        ("ML_SERVICE_URL", "http://localhost:9000"),
        ("BACKEND_URL", "http://localhost:8000"),
        ("NEXT_PUBLIC_BACKEND_URL", "http://localhost:8000"),
        ("NEXT_PUBLIC_ML_URL", "http://localhost:9000"),
    ]

    missing = []
    for var, expected in env_vars:
        value = os.environ.get(var)
        if value:
            print_status(f"{var} = {value}", "ok")
        else:
            print_status(f"{var} no establecido (esperado: {expected})", "warning")
            missing.append((var, expected))

    if missing:
        print_status(f"\nAgrega estas variables de entorno:", "info")
        for var, expected in missing:
            print(f"  export {var}={expected}")

    return len(missing) == 0


def main():
    print(f"\n{COLORS['BLUE']}=== DIAGNÓSTICO DE SISTEMA DE ATENCIÓN DE VISIONCLASS ==={COLORS['END']}\n")

    checks = {
        "ML Service": check_ml_service(),
        "Backend": check_backend(),
        "Cámara": check_camera()[0],
        "MediaPipe": check_mediapipe(),
        "Variables de Entorno": check_env_variables(),
    }

    # Si todo está ok, prueba detección de rostro
    if checks["ML Service"] and checks["Cámara"]:
        resp = test_ml_frame_detection()
        checks["Detección de Rostro"] = resp is not None and resp.get("frame_score", {}).get("data", {}).get("face", False)

    # Resumen
    print(f"\n{COLORS['BLUE']}=== RESUMEN ==={COLORS['END']}")
    for check, result in checks.items():
        status = "ok" if result else "error"
        print_status(f"{check}: {'OK' if result else 'FALLÓ'}", status)

    all_ok = all(checks.values())

    if all_ok:
        print(f"\n{COLORS['GREEN']}¡Todos los checks pasaron! El sistema debería funcionar.{COLORS['END']}")
    else:
        print(f"\n{COLORS['RED']}Hay problemas. Revisa los errores arriba.{COLORS['END']}")
        print(f"\n{COLORS['BLUE']}Para debugging detallado, abre DevTools (F12) en el navegador{COLORS['END']}")
        print(f"{COLORS['BLUE']}y revisa la pestaña 'Console' para ver logs del sistema.{COLORS['END']}")

    # Limpiar
    if os.path.exists("test_frame.jpg"):
        os.remove("test_frame.jpg")

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
