import json
from pathlib import Path
from typing import Any, Dict, List

from django.core.management.base import BaseCommand
from django.db.models import Prefetch

from api.models import D2RResult, AttentionEvent

SEQ_LEN_DEFAULT = 16
STRIDE_DEFAULT = 4


def safe_float(val: Any, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default


def compute_y(summary: Dict[str, Any], duration_sec: float | None = None) -> float:
    hits = safe_float(summary.get("hits"), 0.0)
    errors = safe_float(summary.get("errors"), 0.0)
    omissions = safe_float(summary.get("omissions"), 0.0)

    precision = hits / (hits + errors + 1e-6)
    recall = hits / (hits + omissions + 1e-6)
    f1 = 0.0
    if precision + recall > 0:
        f1 = 2 * precision * recall / (precision + recall)

    speed = 0.0
    if duration_sec and duration_sec > 0:
        speed = hits / duration_sec
        speed = min(speed / 10.0, 1.0)  # normalizar suavemente

    y_phase = max(min(f1 + 0.1 * speed, 1.0), 0.0)
    return y_phase


def extract_features(evt: AttentionEvent) -> List[float]:
    d = evt.data or {}
    frame = d.get("frame", {})
    temporal = d.get("temporal", {})

    return [
        safe_float(frame.get("ear")),
        safe_float(frame.get("eyes_open")),
        safe_float(frame.get("gaze_center")),
        safe_float(frame.get("gaze_deviation")),
        safe_float(frame.get("gaze_offset"), 0.0),
        1.0 if frame.get("face") else 0.0,
        safe_float(temporal.get("temporal_mean")),
        safe_float(temporal.get("eyes_mean")),
        safe_float(temporal.get("gaze_mean")),
        safe_float(temporal.get("frame_score")),
    ]


class Command(BaseCommand):
    help = "Exporta dataset D2R a parquet (X secuencial y label por fase)."

    def add_arguments(self, parser):
        parser.add_argument("--out", type=str, default="dataset.parquet", help="Ruta de salida parquet")
        parser.add_argument("--seq-len", type=int, default=SEQ_LEN_DEFAULT, help="Longitud de secuencia (default 16)")
        parser.add_argument("--stride", type=int, default=STRIDE_DEFAULT, help="Stride de ventana (default 4)")

    def handle(self, *args, **options):
        out_path = Path(options["out"])
        seq_len = int(options["seq_len"])
        stride = int(options["stride"])

        try:
            import pandas as pd
        except ImportError:
            self.stderr.write("Pandas es requerido para exportar parquet. Instala pandas/pyarrow.")
            return

        rows = []

        results = (
            D2RResult.objects.select_related("session", "user")
            .prefetch_related(Prefetch("session__events", queryset=AttentionEvent.objects.all().order_by("timestamp")))
        )

        for res in results:
            phase_data = (res.phase_data or {}).get("phases") or []
            session_events = list(AttentionEvent.objects.filter(session=res.session_id).order_by("timestamp"))

            for phase_entry in phase_data:
                phase_num = int(phase_entry.get("phase", 0) or 0)
                start = phase_entry.get("start")
                end = phase_entry.get("end")
                duration_sec = None
                if start and end:
                    duration_sec = max((end - start) / 1000.0, 0.001) if isinstance(start, (int, float)) else None

                summary = phase_entry.get("summary") or {}
                y_val = compute_y(summary, duration_sec)

                # filtrar eventos por fase via data.context.phase
                evts = [
                    e
                    for e in session_events
                    if (e.data or {}).get("context", {}).get("phase") == phase_num
                ]
                if len(evts) < seq_len:
                    continue

                features_seq = [extract_features(e) for e in evts]

                # ventanas deslizantes
                for start_idx in range(0, len(features_seq) - seq_len + 1, stride):
                    window = features_seq[start_idx : start_idx + seq_len]
                    rows.append(
                        {
                            "session_id": res.session_id,
                            "user_id": res.user_id,
                            "phase": phase_num,
                            "y": y_val,
                            "X": window,
                        }
                    )

        if not rows:
            self.stdout.write("No se generaron filas (verifica datos de D2R/AttentionEvent).")
            return

        df = pd.DataFrame(rows)
        try:
            df.to_parquet(out_path, index=False)
        except Exception as exc:
            self.stderr.write(f"Error escribiendo parquet: {exc}")
            return

        self.stdout.write(
            f"Dataset exportado a {out_path} con {len(df)} ejemplos, "
            f"{df['phase'].nunique()} fases únicas."
        )
