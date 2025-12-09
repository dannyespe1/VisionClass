import os
from datetime import datetime
from typing import Optional, Dict, Any
from collections import deque, defaultdict

import cv2
import numpy as np
import httpx
import mediapipe as mp
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn


BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")
BACKEND_TOKEN = os.environ.get("BACKEND_TOKEN", "")
SEQUENCE_LENGTH = int(os.environ.get("SEQUENCE_LENGTH", "16"))

app = FastAPI(title="ML Attention Service", version="0.1.0")

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

session_sequences: Dict[int, deque] = defaultdict(lambda: deque(maxlen=SEQUENCE_LENGTH))


class AttentionEventPayload(BaseModel):
    session_id: int
    user_id: int
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    value: float = Field(..., description="Attention score between 0 and 1")
    label: Optional[str] = "attention_score"
    data: Dict[str, Any] = Field(default_factory=dict)


def compute_attention_score(image: np.ndarray) -> Dict[str, Any]:
    """
    Heurística inicial usando MediaPipe Face Mesh + Iris para microgestos y gaze.
    Devuelve score en [0,1] basado en:
    - Presencia de rostro
    - Apertura de ojos (EAR)
    - Desviación del gaze (iris) respecto al centro
    """
    h, w, _ = image.shape
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    if not result.multi_face_landmarks:
        return {"value": 0.0, "label": "attention_score", "data": {"face": False}}

    face = result.multi_face_landmarks[0]
    landmarks = [(lm.x * w, lm.y * h, lm.z) for lm in face.landmark]

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

    return {
        "value": score,
        "label": "attention_score",
        "data": {
            "face": True,
            "ear": ear,
            "eyes_open": eyes_open,
            "gaze_center": gaze_center,
            "gaze_offset": norm_offset.tolist(),
        },
    }


def aggregate_temporal_score(session_id: int, frame_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Placeholder para CNN-LSTM: agregamos características de la ventana reciente
    y calculamos un score temporal. Sustituir por inferencia real de modelo secuencial.
    """
    seq = session_sequences[session_id]
    seq.append(
        {
            "score": frame_result["value"],
            "eyes_open": frame_result["data"].get("eyes_open", 0),
            "gaze_center": frame_result["data"].get("gaze_center", 0),
            "ear": frame_result["data"].get("ear", 0),
        }
    )
    scores = np.array([x["score"] for x in seq])
    eyes = np.array([x["eyes_open"] for x in seq])
    gaze = np.array([x["gaze_center"] for x in seq])

    temporal_score = float(np.mean(scores))
    eyes_score = float(np.mean(eyes))
    gaze_score = float(np.mean(gaze))

    combined = float(np.clip(0.6 * temporal_score + 0.2 * eyes_score + 0.2 * gaze_score, 0, 1))

    return {
        "value": combined,
        "label": "attention_sequence_score",
        "data": {
            "sequence_len": len(seq),
            "frame_score": frame_result["value"],
            "temporal_mean": temporal_score,
            "eyes_mean": eyes_score,
            "gaze_mean": gaze_score,
        },
    }


async def post_event_to_backend(payload: AttentionEventPayload) -> None:
    if not BACKEND_TOKEN:
        return
    url = f"{BACKEND_URL}/api/attention-events/"
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
    await post_event_to_backend(payload)
    return {"ok": True, "forwarded": bool(BACKEND_TOKEN)}


@app.post("/analyze/frame")
async def analyze_frame(
    file: UploadFile = File(...),
    session_id: int = Form(...),
    user_id: int = Form(...),
):
    """
    Recibe un frame (image/jpeg o png), calcula score y reenvía al backend.
    Pensado para ser llamado desde el frontend (captura de cámara).
    """
    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    result = compute_attention_score(image)
    temporal = aggregate_temporal_score(session_id, result)

    payload = AttentionEventPayload(
        session_id=session_id,
        user_id=user_id,
        value=temporal["value"],
        label=temporal.get("label", "attention_sequence_score"),
        data={
            "temporal": temporal.get("data", {}),
            "frame": result.get("data", {}),
        },
    )
    await post_event_to_backend(payload)
    return JSONResponse({"ok": True, "score": temporal, "frame_score": result})


if __name__ == "__main__":
    uvicorn.run("ml_service:app", host="0.0.0.0", port=9000, reload=False)
