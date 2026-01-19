import json
from pathlib import Path
from typing import Any, Dict, List

from django.core.management.base import BaseCommand

from api.models import D2RResult, D2RAttentionEvent

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
        speed = min(speed / 10.0, 1.0)

    return max(min(f1 + 0.1 * speed, 1.0), 0.0)


class Command(BaseCommand):
    help = "Exporta dataset de frames D2R (paths de imágenes + y continuo) a parquet."

    def add_arguments(self, parser):
        parser.add_argument("--out", type=str, default="frames_dataset.parquet", help="Ruta de salida parquet")
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

        rows: List[Dict[str, Any]] = []

        results = D2RResult.objects.select_related("d2r_session", "user")

        for res in results:
            phases = (res.phase_data or {}).get("phases") or []
            for phase_entry in phases:
                ph = int(phase_entry.get("phase", 0) or 0)
                summary = phase_entry.get("summary") or {}
                start = phase_entry.get("start")
                end = phase_entry.get("end")
                duration_sec = None
                if start and end and isinstance(start, (int, float)) and isinstance(end, (int, float)):
                    duration_sec = max((end - start) / 1000.0, 0.001)
                y_val = compute_y(summary, duration_sec)

                evts = D2RAttentionEvent.objects.filter(
                    d2r_session=res.d2r_session_id,
                    data__context__phase=ph,
                ).order_by("timestamp")

                paths = [ (e.data or {}).get("frame", {}).get("frame_path") for e in evts ]
                spinning_flags = [ int((e.data or {}).get("context", {}).get("spinning") or 0) for e in evts ]
                if len(paths) < seq_len:
                    continue

                # ventanas
                for start_idx in range(0, len(paths) - seq_len + 1, stride):
                    window_paths = paths[start_idx : start_idx + seq_len]
                    window_spinning = spinning_flags[start_idx : start_idx + seq_len]
                    if any(p is None for p in window_paths):
                        continue
                    rows.append(
                        {
                            "session_id": res.d2r_session_id,
                            "user_id": res.user_id,
                            "phase": ph,
                            "frames_paths": window_paths,
                            "mask": [0 if s else 1 for s in window_spinning],  # 0 = spinning
                            "y": y_val,
                        }
                    )

        if not rows:
            self.stdout.write("No se generaron filas (sin frame_path o sin eventos suficientes).")
            return

        df = pd.DataFrame(rows)
        try:
            df.to_parquet(out_path, index=False)
        except Exception as exc:
            self.stderr.write(f"Error escribiendo parquet: {exc}")
            return

        self.stdout.write(
            f"Dataset de frames exportado a {out_path} con {len(df)} ejemplos, fases únicas: {df['phase'].nunique()}."
        )
