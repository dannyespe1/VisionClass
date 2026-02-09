import os
import sys
import subprocess
from threading import Thread
from datetime import datetime
from typing import Optional, Dict, Any
from collections import deque, defaultdict
from pathlib import Path

import cv2
import numpy as np
import httpx
import mediapipe as mp
import onnxruntime as ort
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
import uvicorn


BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")
BACKEND_TOKEN = os.environ.get("BACKEND_TOKEN", "")
SEQUENCE_LENGTH = int(os.environ.get("SEQUENCE_LENGTH", "16"))
MODEL_PATH = os.environ.get("MODEL_PATH", "checkpoints/cnn_lstm.onnx")
MODEL_IMG_SIZE = int(os.environ.get("MODEL_IMG_SIZE", "224"))
TRAIN_ON_START = os.environ.get("TRAIN_ON_START", "0") == "1"
TRAINING_SCRIPT = os.environ.get("TRAINING_SCRIPT", "train_model.py")

app = FastAPI(title="ML Attention Service", version="0.1.0")

allowed_origins = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    mp_face_mesh = mp.solutions.face_mesh
except AttributeError:
    try:
        from mediapipe.python import solutions as mp_solutions
        mp_face_mesh = mp_solutions.face_mesh
    except Exception:
        mp_face_mesh = None

if mp_face_mesh is not None:
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    print("✅ [INIT] MediaPipe FaceMesh initialized successfully")
else:
    face_mesh = None
    print("⚠️  [INIT] MediaPipe FaceMesh initialization FAILED - face_mesh=None")

session_sequences: Dict[int, deque] = defaultdict(lambda: deque(maxlen=SEQUENCE_LENGTH))
session_frame_buffers: Dict[int, deque] = defaultdict(lambda: deque(maxlen=SEQUENCE_LENGTH))

# Cargar modelo ONNX (opcional, fallback si no existe)
try:
    ort_session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
except Exception:
    ort_session = None


def _start_background_training() -> None:
    if not TRAIN_ON_START:
        return
    script_path = os.path.join(os.path.dirname(__file__), TRAINING_SCRIPT)
    if not os.path.exists(script_path):
        return
    def _run():
        try:
            subprocess.run([sys.executable, script_path], check=False)
        except Exception:
            pass
    Thread(target=_run, daemon=True).start()


_start_background_training()


class AttentionEventPayload(BaseModel):
    session_id: Optional[int] = None
    d2r_session_id: Optional[int] = None
    user_id: int
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    value: float = Field(..., description="Attention score between 0 and 1")
    label: Optional[str] = "attention_score"
    data: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def ensure_session_present(self):
        if not self.session_id and not self.d2r_session_id:
            raise ValueError("session_id o d2r_session_id requerido")
        return self


def compute_attention_score(image: np.ndarray) -> Dict[str, Any]:
    """
    Heurística inicial usando MediaPipe Face Mesh + Iris para microgestos y gaze.
    Devuelve score en [0,1] basado en:
    - Presencia de rostro
    - Apertura de ojos (EAR)
    - Desviación del gaze (iris) respecto al centro
    """
    if face_mesh is None:
        return {"value": None, "label": "no_face", "data": {"face": False}}

    h, w, _ = image.shape
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    if not result.multi_face_landmarks:
        return {"value": None, "label": "no_face", "data": {"face": False}}

    face = result.multi_face_landmarks[0]
    landmarks = [(lm.x * w, lm.y * h, lm.z) for lm in face.landmark]
    xs = [p[0] for p in landmarks]
    ys = [p[1] for p in landmarks]
    x0, x1 = max(min(xs), 0), min(max(xs), w)
    y0, y1 = max(min(ys), 0), min(max(ys), h)
    bbox = [x0, y0, x1, y1]

    # Índices de ojos (MediaPipe Face Mesh)
    left_eye_idx = [33, 160, 158, 133, 153, 144]  # borde ojo izquierdo
    right_eye_idx = [263, 387, 385, 362, 380, 373]  # borde ojo derecho
    left_iris_idx = [468, 469, 470, 471]
    right_iris_idx = [473, 474, 475, 476]

    def eye_aspect_ratio(idx_list):
        p = [landmarks[i] for i in idx_list]
        # vertical: 1-5, 2-4; horizontal: 0-3 (usando orden anterior)
        vert = (abs(p[1][1] - p[5][1]) + abs(p[2][1] - p[4][1])) / 2.0
        horiz = abs(p[0][0] - p[3][0]) + 1e-6
        return vert / horiz

    left_ear = eye_aspect_ratio(left_eye_idx)
    right_ear = eye_aspect_ratio(right_eye_idx)
    ear = (left_ear + right_ear) / 2

    def iris_offset(iris_idx, eye_idx):
        iris = np.mean(np.array([landmarks[i][:2] for i in iris_idx]), axis=0)
        eye = np.mean(np.array([landmarks[i][:2] for i in eye_idx]), axis=0)
        offset = iris - eye
        return offset

    left_offset = iris_offset(left_iris_idx, left_eye_idx)
    right_offset = iris_offset(right_iris_idx, right_eye_idx)
    offset = (left_offset + right_offset) / 2

    # Normalizar offsets por tamaño de ojo para medir desviación
    eye_width = np.linalg.norm(
        np.array(landmarks[left_eye_idx[0]][:2]) - np.array(landmarks[left_eye_idx[3]][:2])
    )
    if eye_width == 0:
        eye_width = 1.0
    norm_offset = offset / eye_width
    gaze_deviation = np.linalg.norm(norm_offset)  # 0 centrado, >0 desviado

    # Heurística de score
    eyes_open = np.clip((ear - 0.15) / (0.25 - 0.15), 0, 1)  # EAR ~0.2 normal
    gaze_center = np.clip(1 - gaze_deviation * 2.0, 0, 1)  # penaliza desvíos
    presence = 1.0

    score = float(np.clip(0.5 * eyes_open + 0.4 * gaze_center + 0.1 * presence, 0, 1))

    gaze_deviation = float(gaze_deviation)

    return {
        "value": score,
        "label": "attention_score",
        "data": {
            "face": True,
            "ear": ear,
            "eyes_open": eyes_open,
            "gaze_center": gaze_center,
            "gaze_offset": norm_offset.tolist(),
            "gaze_deviation": gaze_deviation,
            "bbox": bbox,
        },
    }


def aggregate_temporal_score(session_id: int, frame_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Placeholder para CNN-LSTM: agregamos características de la ventana reciente
    y calculamos un score temporal. Sustituir por inferencia real de modelo secuencial.
    """
    seq = session_sequences[session_id]
    score_val = frame_result.get("value")
    seq.append(
        {
            "score": score_val,
            "eyes_open": frame_result["data"].get("eyes_open", 0),
            "gaze_center": frame_result["data"].get("gaze_center", 0),
            "ear": frame_result["data"].get("ear", 0),
        }
    )
    scores = [x["score"] for x in seq if x.get("score") is not None]
    eyes = [x["eyes_open"] for x in seq]
    gaze = [x["gaze_center"] for x in seq]

    temporal_score = float(np.mean(scores)) if scores else 0.0
    eyes_score = float(np.mean(eyes)) if eyes else 0.0
    gaze_score = float(np.mean(gaze)) if gaze else 0.0

    combined = float(np.clip(0.6 * temporal_score + 0.2 * eyes_score + 0.2 * gaze_score, 0, 1))

    return {
        "value": combined,
        "label": "attention_sequence_score",
        "data": {
            "sequence_len": len(seq),
            "frame_score": score_val,
            "temporal_mean": temporal_score,
            "eyes_mean": eyes_score,
            "gaze_mean": gaze_score,
        },
    }


async def post_event_to_backend(payload: AttentionEventPayload, test_name: str = "D2R") -> None:
    if not BACKEND_TOKEN:
        return
    normalized_test = (test_name or "").upper()
    is_d2r = normalized_test == "D2R" or (normalized_test == "" and payload.d2r_session_id is not None)
    if is_d2r and not payload.d2r_session_id:
        raise HTTPException(status_code=400, detail="d2r_session_id requerido")
    if not is_d2r and not payload.session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")
    endpoint = "/api/d2r-attention-events/" if is_d2r else "/api/attention-events/"
    url = f"{BACKEND_URL}{endpoint}"
    headers = {"Authorization": f"Bearer {BACKEND_TOKEN}"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json=payload.model_dump())
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail="Backend event post failed")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/events")
async def receive_event(payload: AttentionEventPayload):
    """
    Endpoint para recibir eventos de atención ya calculados
    (por ejemplo, desde otro proceso ML).
    """
    test_name = "D2R" if payload.d2r_session_id is not None else "COURSE"
    await post_event_to_backend(payload, test_name=test_name)
    return {"ok": True, "forwarded": bool(BACKEND_TOKEN)}


@app.post("/analyze/frame")
async def analyze_frame(
    file: UploadFile = File(...),
    d2r_session_id: Optional[int] = Form(None),
    session_id: Optional[int] = Form(None),
    user_id: int = Form(...),
    phase: int = Form(0),
    time_left: float = Form(0),
    spinning: int = Form(0),
    test_name: str = Form("D2R"),
):
    """
    Recibe un frame (image/jpeg o png), calcula score y reenvía al backend.
    Pensado para ser llamado desde el frontend (captura de cámara).
    """
    if not d2r_session_id and not session_id:
        raise HTTPException(status_code=422, detail="session_id o d2r_session_id requerido")
    session_key = d2r_session_id if d2r_session_id is not None else session_id

    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    result = compute_attention_score(image)
    temporal = aggregate_temporal_score(session_key, result)

    # LOG DETALLADO para debugging
    has_face = result.get("data", {}).get("face", False)
    frame_score = result.get("value")
    temporal_score = temporal.get("value")
    frame_score_str = f"{frame_score:.2f}" if frame_score is not None else "None"
    temporal_score_str = f"{temporal_score:.2f}" if temporal_score is not None else "None"
    print(f"[analyze/frame] session={session_key}, face={has_face}, frame_score={frame_score_str}, temporal={temporal_score_str}")

    # Opcional: guardar frame para dataset (no es video, solo imágenes sueltas)
    frame_path = None
    if os.environ.get("SAVE_FRAMES", "0") == "1":
        base_dir = Path(os.environ.get("FRAMES_DIR", "data/frames"))
        target_dir = base_dir / str(session_key)
        target_dir.mkdir(parents=True, exist_ok=True)
        fname = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S%f')}_p{phase}.jpg"
        fpath = target_dir / fname
        try:
            with open(fpath, "wb") as f:
                f.write(content)
            frame_path = str(fpath)
        except Exception:
            frame_path = None
    if frame_path:
        result.setdefault("data", {})["frame_path"] = frame_path

    # buffer de frames para modelo CNN-LSTM
    model_score = None
    if result.get("data", {}).get("face", False):
        bbox = result["data"].get("bbox")
        try:
            if bbox:
                x0, y0, x1, y1 = map(int, bbox)
                x0 = max(x0 - int(0.1 * (x1 - x0)), 0)
                y0 = max(y0 - int(0.1 * (y1 - y0)), 0)
                x1 = min(x1 + int(0.1 * (x1 - x0)), image.shape[1])
                y1 = min(y1 + int(0.1 * (y1 - y0)), image.shape[0])
                crop = image[y0:y1, x0:x1]
            else:
                crop = image
            crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            crop = cv2.resize(crop, (MODEL_IMG_SIZE, MODEL_IMG_SIZE))
            crop = crop.astype("float32") / 255.0
            crop = np.transpose(crop, (2, 0, 1))  # C,H,W
            session_frame_buffers[session_key].append(crop)
        except Exception as e:
            print(f"[analyze/frame] Error procesando frame para modelo: {e}")

        if ort_session and len(session_frame_buffers[session_key]) >= SEQUENCE_LENGTH and int(spinning) == 0:
            try:
                seq = list(session_frame_buffers[session_key])[-SEQUENCE_LENGTH:]
                arr = np.stack(seq, axis=0)[None, ...]  # 1,T,C,H,W
                ort_out = ort_session.run(None, {"frames": arr, "mask": None})
                if ort_out:
                    model_score = float(np.clip(np.ravel(ort_out[0])[0], 0.0, 1.0))
                    print(f"[analyze/frame] Modelo CNN-LSTM calculado: {model_score:.4f}")
            except Exception as e:
                print(f"[analyze/frame] Error ejecutando modelo CNN-LSTM: {e}")
                model_score = None

    label = "attention_model" if model_score is not None else (
        temporal.get("label", "attention_sequence_score") if result["value"] is not None else "no_face"
    )
    value = model_score if model_score is not None else float(temporal.get("value", 0.0))

    normalized_test = (test_name or "").upper()
    is_d2r = normalized_test == "D2R" or (normalized_test == "" and d2r_session_id is not None)
    payload = AttentionEventPayload(
        d2r_session_id=session_key if is_d2r else None,
        session_id=None if is_d2r else session_key,
        user_id=user_id,
        value=value,
        label=label,
        data={
            "context": {
                "test": test_name or ("D2R" if is_d2r else "COURSE"),
                "phase": phase,
                "spinning": int(spinning),
                "time_left": time_left,
            },
            "state": "no_face" if not result.get("data", {}).get("face", False) else "ok",
            "temporal": temporal.get("data", {}),
            "frame": result.get("data", {}),
            "score_model": model_score,
            "score_baseline": result.get("value"),
        },
    )
    await post_event_to_backend(payload, test_name=(test_name or ("D2R" if is_d2r else "COURSE")))
    return JSONResponse({"ok": True, "score": temporal, "frame_score": result})


if __name__ == "__main__":
    uvicorn.run("ml_service:app", host="0.0.0.0", port=9000, reload=False)
