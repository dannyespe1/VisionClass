from django.conf import settings


def get_redis_client():
    if not settings.REDIS_ENABLED:
        return None
    from redis import Redis

    return Redis.from_url(
        settings.REDIS_URL,
        socket_connect_timeout=1,
        socket_timeout=1,
        decode_responses=True,
    )


def redis_health():
    if not settings.REDIS_ENABLED:
        return {"status": "disabled"}
    try:
        client = get_redis_client()
        client.ping()
        return {"status": "ok"}
    except Exception:
        return {"status": "error"}
