import json
import re


SAFE_ID = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
ALLOWED_PAYLOAD_FIELDS = {"contract_version", "event_id", "correlation_id", "event_type", "data", "retry"}


class StreamPipeline:
    def __init__(self, client, namespace="visionclass:v1", max_retries=3, max_length=10000):
        self.client = client
        self.events_stream = f"{namespace}:events"
        self.dead_stream = f"{namespace}:events:dead"
        self.done_prefix = f"{namespace}:events:done:"
        self.max_retries = max_retries
        self.max_length = max_length

    def _validate(self, payload):
        if not isinstance(payload, dict) or set(payload) - ALLOWED_PAYLOAD_FIELDS:
            raise ValueError("invalid stream payload")
        if payload.get("contract_version") != "2.0":
            raise ValueError("unsupported contract version")
        for field in ("event_id", "correlation_id"):
            if not SAFE_ID.fullmatch(str(payload.get(field, ""))):
                raise ValueError(f"invalid {field}")
        if not isinstance(payload.get("data"), dict):
            raise ValueError("data must be an object")

    def publish(self, payload):
        self._validate(payload)
        values = {key: json.dumps(value, separators=(",", ":")) for key, value in payload.items()}
        return self.client.xadd(self.events_stream, values, maxlen=self.max_length, approximate=True)

    def process(self, group, message_id, fields, handler):
        payload = {key: json.loads(value) for key, value in fields.items()}
        self._validate(payload)
        done_key = f"{self.done_prefix}{payload['event_id']}"
        if self.client.get(done_key):
            self.client.xack(self.events_stream, group, message_id)
            return "duplicate"
        try:
            handler(payload)
        except Exception as exc:
            retry = int(payload.get("retry", 0)) + 1
            safe_reason = type(exc).__name__
            if retry > self.max_retries:
                dead = dict(payload, retry=retry, failure_reason=safe_reason)
                self.client.xadd(self.dead_stream, {"payload": json.dumps(dead, separators=(",", ":"))}, maxlen=self.max_length, approximate=True)
                result = "dead_letter"
            else:
                self.publish(dict(payload, retry=retry))
                result = "retry"
            self.client.xack(self.events_stream, group, message_id)
            return result
        self.client.set(done_key, "1", ex=86400, nx=True)
        self.client.xack(self.events_stream, group, message_id)
        return "processed"

    def reclaim(self, group, consumer, min_idle_ms=30000, start_id="0-0", count=100):
        return self.client.xautoclaim(self.events_stream, group, consumer, min_idle_ms, start_id, count=count)
