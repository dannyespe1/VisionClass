from datetime import datetime, timezone
from math import floor, isfinite


FEATURE_CONTRACT_VERSION = "normalized-features-v1"
WINDOW_DURATION_MS = 5000


def _clamp(value, low, high):
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not isfinite(number):
        return None
    return min(high, max(low, number))


def _iso(milliseconds):
    return datetime.fromtimestamp(milliseconds / 1000, tz=timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _rotate(x, y, orientation):
    if x is None or y is None:
        return x, y
    if orientation == 90:
        return 1 - y, x
    if orientation == 180:
        return 1 - x, 1 - y
    if orientation == 270:
        return y, 1 - x
    return x, y


def normalize_browser_sample(sample, *, orientation=0, window_ms=WINDOW_DURATION_MS):
    if orientation not in {0, 90, 180, 270}:
        raise ValueError("invalid_orientation")
    if isinstance(window_ms, bool) or not isinstance(window_ms, int) or window_ms < 1000:
        raise ValueError("invalid_window_ms")
    try:
        captured = datetime.fromisoformat(str(sample["captured_at"]).replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("invalid_captured_at") from exc
    captured_ms = int(captured.timestamp() * 1000)
    raw = sample.get("features") or {}
    center_x, center_y = _rotate(_clamp(raw.get("face_center_x"), 0, 1), _clamp(raw.get("face_center_y"), 0, 1), orientation)
    quarter_turn = orientation in {90, 270}
    window_start = floor(captured_ms / window_ms) * window_ms
    face_present = _clamp(raw.get("face_present"), 0, 1)
    observable = sample.get("quality", {}).get("observable") is True and face_present == 1
    confidence = _clamp(sample.get("quality", {}).get("confidence"), 0, 1) if observable else None
    return {
        "captured_at": _iso(captured_ms),
        "window": {"started_at": _iso(window_start), "ended_at": _iso(window_start + window_ms)},
        "features": {
            "face_present": face_present,
            "face_count": _clamp(raw.get("face_count"), 0, 1),
            "face_center_x": center_x,
            "face_center_y": center_y,
            "face_width": _clamp(raw.get("face_height") if quarter_turn else raw.get("face_width"), 0, 1),
            "face_height": _clamp(raw.get("face_width") if quarter_turn else raw.get("face_height"), 0, 1),
            "eye_span": _clamp(raw.get("eye_span"), 0, 1),
            "head_roll": _clamp(raw.get("head_roll"), -1, 1),
            "gaze_horizontal_proxy": _clamp(raw.get("gaze_horizontal_proxy"), 0, 1),
            "pose_available": _clamp(raw.get("pose_available"), 0, 1),
            "gaze_available": _clamp(raw.get("gaze_available"), 0, 1),
            "window_offset_ms": captured_ms - window_start,
            "window_duration_ms": window_ms,
        },
        "quality": {
            "observable": observable,
            "confidence": confidence,
            "reason": None if observable else (sample.get("quality", {}).get("reason") or "insufficient_signal"),
        },
    }
