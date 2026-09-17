import json
import logging
import time
import uuid

from django.conf import settings


LOGGER = logging.getLogger("visionclass.operations")


def _correlation_id(request):
    candidate = request.headers.get("X-Correlation-ID", "")
    try:
        parsed = uuid.UUID(candidate)
        if len(candidate) == 36:
            return str(parsed)
    except (ValueError, AttributeError, TypeError):
        pass
    return str(uuid.uuid4())


def _route(request):
    match = getattr(request, "resolver_match", None)
    return str(match.route) if match and match.route else "unmatched"


class OperationalObservabilityMiddleware:
    """Emit a minimal request completion event without identity or payload data."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = _correlation_id(request)
        request.META["HTTP_X_CORRELATION_ID"] = correlation_id
        started = time.perf_counter()
        response = self.get_response(request)
        response["X-Correlation-ID"] = correlation_id

        if settings.PRODUCTION_OBSERVABILITY:
            duration_ms = round((time.perf_counter() - started) * 1000, 3)
            event = {
                "event": "http_request_completed",
                "correlation_id": correlation_id,
                "method": request.method,
                "route": _route(request),
                "status": response.status_code,
                "duration_ms": duration_ms,
                "outcome": "success" if response.status_code < 500 else "server_error",
            }
            LOGGER.info(json.dumps(event, separators=(",", ":"), sort_keys=True))
        return response
