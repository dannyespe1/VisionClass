import math
from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from .models import InferredState


PERIOD_DAYS = {"30d": 30, "90d": 90, "all": None}
SAFE_STATES = {
    InferredState.STATE_TASK_ORIENTED_EVIDENCE,
    InferredState.STATE_OFF_TASK_EVIDENCE,
    InferredState.STATE_NO_OBSERVABLE,
    InferredState.STATE_UNKNOWN,
}


def _round(value):
    return round(value, 4)


def _participant_band(count):
    if count < 40:
        return "20-39"
    if count < 80:
        return "40-79"
    return "80+"


def _period_cutoff(period, now):
    days = PERIOD_DAYS[period]
    return now - timedelta(days=days) if days else None


def _events_in_period(events, period, now):
    cutoff = _period_cutoff(period, now)
    return [event for event in events if cutoff is None or event.occurred_at >= cutoff]


def _complement_is_safe(events, period, now, minimum_participants):
    if period == "all":
        return True

    cutoff_30 = _period_cutoff("30d", now)
    cutoff_90 = _period_cutoff("90d", now)
    slices = []
    if period == "90d":
        slices.append([event for event in events if event.occurred_at < cutoff_90])
    else:
        slices.extend(
            [
                [event for event in events if cutoff_90 <= event.occurred_at < cutoff_30],
                [event for event in events if event.occurred_at < cutoff_90],
                [event for event in events if event.occurred_at < cutoff_30],
            ]
        )

    for excluded in slices:
        contributors = {event.temporal_session.participant_id for event in excluded}
        if 0 < len(contributors) < minimum_participants:
            return False
    return True


def _safe_latest_state(window):
    states = list(window.inferred_states.all())
    latest = states[-1] if states else None
    if latest is None or latest.state not in SAFE_STATES:
        return InferredState.STATE_UNKNOWN, None
    return latest.state, latest.uncertainty


def _summarize(events, minimum_participants, minimum_observable_windows):
    participants = {event.temporal_session.participant_id for event in events}
    if len(participants) < minimum_participants:
        return None, "minimum_participants"

    windows = {}
    for event in events:
        if event.window_id:
            windows[event.window_id] = (event.window, event.temporal_session.participant_id)

    counts = defaultdict(int)
    uncertainties = []
    participant_observable = defaultdict(lambda: [0, 0])
    observable_participants = set()
    for window, participant_id in windows.values():
        state, uncertainty = _safe_latest_state(window)
        counts[state] += 1
        if state in {
            InferredState.STATE_TASK_ORIENTED_EVIDENCE,
            InferredState.STATE_OFF_TASK_EVIDENCE,
        }:
            observable_participants.add(participant_id)
            participant_observable[participant_id][1] += 1
            if state == InferredState.STATE_TASK_ORIENTED_EVIDENCE:
                participant_observable[participant_id][0] += 1
            if uncertainty is not None:
                uncertainties.append(uncertainty)

    observable_windows = (
        counts[InferredState.STATE_TASK_ORIENTED_EVIDENCE]
        + counts[InferredState.STATE_OFF_TASK_EVIDENCE]
    )
    if len(observable_participants) < minimum_participants:
        return None, "minimum_observable_participants"
    if observable_windows < minimum_observable_windows:
        return None, "minimum_observable_windows"
    if len(uncertainties) != observable_windows:
        return None, "missing_uncertainty"

    participant_ratios = [oriented / observable for oriented, observable in participant_observable.values()]
    mean_ratio = sum(participant_ratios) / len(participant_ratios)
    if len(participant_ratios) > 1:
        variance = sum((value - mean_ratio) ** 2 for value in participant_ratios) / (
            len(participant_ratios) - 1
        )
        margin = 1.96 * math.sqrt(variance / len(participant_ratios))
    else:
        margin = 0.0

    total_windows = len(windows)
    mean_uncertainty = sum(uncertainties) / len(uncertainties) if uncertainties else None
    return (
        {
            "participant_band": _participant_band(len(participants)),
            "total_windows": total_windows,
            "observable_windows": observable_windows,
            "coverage": _round(observable_windows / total_windows) if total_windows else None,
            "mean_uncertainty": _round(mean_uncertainty) if mean_uncertainty is not None else None,
            "distribution": {
                "task_oriented_evidence_ratio": _round(mean_ratio),
                "off_task_evidence_ratio": _round(1.0 - mean_ratio),
                "no_observable_ratio": _round(
                    counts[InferredState.STATE_NO_OBSERVABLE] / total_windows
                ) if total_windows else None,
                "unknown_ratio": _round(counts[InferredState.STATE_UNKNOWN] / total_windows)
                if total_windows else None,
            },
            "task_oriented_interval_95": {
                "lower": _round(max(0.0, mean_ratio - margin)),
                "upper": _round(min(1.0, mean_ratio + margin)),
                "method": "participant_mean_normal_approximation",
            },
        },
        None,
    )


def _weekly_trend(events, minimum_participants, minimum_observable_windows):
    groups = defaultdict(list)
    for event in events:
        monday = (event.occurred_at - timedelta(days=event.occurred_at.weekday())).date().isoformat()
        groups[monday].append(event)

    trend = []
    for period_start in sorted(groups):
        summary, reason = _summarize(
            groups[period_start], minimum_participants, minimum_observable_windows
        )
        if summary is None:
            trend.append({"period_start": period_start, "status": "suppressed", "reason_code": reason})
        else:
            trend.append(
                {
                    "period_start": period_start,
                    "status": "published",
                    "coverage": summary["coverage"],
                    "mean_uncertainty": summary["mean_uncertainty"],
                    "task_oriented_evidence_ratio": summary["distribution"][
                        "task_oriented_evidence_ratio"
                    ],
                    "task_oriented_interval_95": summary["task_oriented_interval_95"],
                }
            )
    return trend


def build_teacher_group_dashboard(
    events,
    *,
    period,
    minimum_participants,
    minimum_observable_windows,
    now=None,
):
    now = now or timezone.now()
    grouped = defaultdict(list)
    for event in events:
        course = event.temporal_session.course_session.course
        grouped[(course.id, course.title, event.resource_kind, event.resource_reference)].append(event)

    activities = []
    course_positions = defaultdict(int)
    for key in sorted(grouped, key=lambda item: (item[1].lower(), item[2], item[3])):
        course_id, course_title, resource_kind, _resource_reference = key
        course_positions[course_id] += 1
        base = {
            "course_id": course_id,
            "course_title": course_title,
            "activity_label": f"Actividad {course_positions[course_id]}",
            "resource_kind": resource_kind,
        }
        all_events = grouped[key]
        selected_events = _events_in_period(all_events, period, now)
        if not _complement_is_safe(all_events, period, now, minimum_participants):
            activities.append(
                {
                    **base,
                    "status": "suppressed",
                    "reason_code": "complementary_period_suppression",
                    "minimum_participants": minimum_participants,
                }
            )
            continue

        summary, reason = _summarize(
            selected_events, minimum_participants, minimum_observable_windows
        )
        if summary is None:
            activities.append(
                {
                    **base,
                    "status": "suppressed",
                    "reason_code": reason,
                    "minimum_participants": minimum_participants,
                }
            )
            continue

        activities.append(
            {
                **base,
                "status": "published",
                **summary,
                "trend": _weekly_trend(
                    selected_events, minimum_participants, minimum_observable_windows
                ),
            }
        )
    return activities
