from django.conf import settings
from django.utils import timezone

from .models import ConsentEvent


REQUIRED_CAPTURE_PURPOSES = (
    ConsentEvent.PURPOSE_LOCAL_PROCESSING,
    ConsentEvent.PURPOSE_DERIVED_PERSISTENCE,
)


def consent_status(participant):
    version = settings.CONSENT_CURRENT_VERSION
    enabled = bool(settings.CONSENT_V2_ENABLED)
    text_approved = bool(settings.CONSENT_TEXT_APPROVED)
    purposes = {}
    now = timezone.now()
    for purpose, _ in ConsentEvent.PURPOSE_CHOICES:
        event = (
            ConsentEvent.objects.filter(participant=participant, purpose=purpose)
            .order_by("-created_at", "-id")
            .first()
        )
        valid = bool(
            enabled
            and text_approved
            and event
            and event.version == version
            and event.action == ConsentEvent.ACTION_GRANT
            and (event.expires_at is None or event.expires_at > now)
        )
        purposes[purpose] = {
            "granted": valid,
            "latest_action": event.action if event else None,
            "version": event.version if event else None,
            "expires_at": event.expires_at if event else None,
        }
    capture_allowed = all(purposes[p]["granted"] for p in REQUIRED_CAPTURE_PURPOSES)
    return {
        "enabled": enabled,
        "text_approved": text_approved,
        "current_version": version,
        "capture_allowed": capture_allowed,
        "teacher_access": False,
        "images_stored": False,
        "purposes": purposes,
    }


def has_capture_consent(participant):
    return consent_status(participant)["capture_allowed"]
