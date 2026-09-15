from collections import Counter


QUALITY_THRESHOLDS_V1 = {
    "minimum_luminance": 0.15,
    "minimum_face_edge_margin": 0.02,
    "minimum_confidence": 0.5,
    "minimum_frames": 3,
    "minimum_observable_ratio": 0.6,
    "maximum_gap_ms": 2500,
}


def evaluate_frame(sample, thresholds=QUALITY_THRESHOLDS_V1):
    features = sample.get("features") if isinstance(sample, dict) else None
    if not features or features.get("face_present") is None:
        return _frame(False, "no_data", None)
    confidence = (sample.get("quality") or {}).get("confidence", features.get("detection_confidence"))
    if features["face_present"] == 0:
        return _frame(False, "face_absent", confidence)
    luminance = features.get("luminance_mean")
    if luminance is not None and luminance < thresholds["minimum_luminance"]:
        return _frame(False, "low_illumination", confidence)
    margin = features.get("face_edge_margin")
    if margin is not None and margin < thresholds["minimum_face_edge_margin"]:
        return _frame(False, "partial_face", confidence)
    if features.get("pose_available") == 0 and features.get("gaze_available") == 0:
        return _frame(False, "occluded", confidence)
    if confidence is not None and confidence < thresholds["minimum_confidence"]:
        return _frame(False, "low_confidence", confidence)
    return _frame(True, None, confidence)


def evaluate_window(samples, thresholds=QUALITY_THRESHOLDS_V1):
    if not samples:
        return _window(False, "no_data", 0, 0)
    ordered = sorted(samples, key=lambda sample: sample["captured_at"])
    if len(ordered) < thresholds["minimum_frames"]:
        return _window(False, "insufficient_data", 0, len(ordered))
    times = [_milliseconds(sample["captured_at"]) for sample in ordered]
    if any(current - previous > thresholds["maximum_gap_ms"] for previous, current in zip(times, times[1:])):
        return _window(False, "frame_loss", 0, len(ordered))
    evaluated = [evaluate_frame(sample, thresholds) for sample in ordered]
    observable = [item for item in evaluated if item["observable"]]
    ratio = len(observable) / len(evaluated)
    if ratio < thresholds["minimum_observable_ratio"]:
        reasons = Counter(item["reason"] for item in evaluated if item["reason"])
        return _window(False, reasons.most_common(1)[0][0] if reasons else "insufficient_continuity", ratio, len(evaluated))
    confidence_values = [item["confidence"] for item in observable if item["confidence"] is not None]
    confidence = sum(confidence_values) / len(confidence_values) if confidence_values else None
    return _window(True, None, ratio, len(evaluated), confidence)


def _milliseconds(value):
    from datetime import datetime
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)


def _frame(observable, reason, confidence):
    return {"observable": observable, "reason": reason, "confidence": confidence}


def _window(allow, reason, ratio, count, confidence=None):
    return {"observable": allow, "allow_inference": allow, "allow_intervention": False, "reason": reason, "observable_ratio": ratio, "sample_count": count, "confidence": confidence}
