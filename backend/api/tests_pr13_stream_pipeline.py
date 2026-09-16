import json
from django.test import SimpleTestCase

from .stream_pipeline import DefinitiveStreamError, StreamPipeline


class FakeRedis:
    def __init__(self): self.streams = {}; self.values = {}; self.acks = []
    def xadd(self, stream, values, **_kwargs): self.streams.setdefault(stream, []).append(values); return f"{len(self.streams[stream])}-0"
    def xack(self, stream, group, message): self.acks.append((stream, group, message))
    def get(self, key): return self.values.get(key)
    def set(self, key, value, **_kwargs): self.values[key] = value
    def xautoclaim(self, *args, **kwargs): return (args, kwargs)


def payload(event_id="event:0001", retry=0):
    return {"contract_version": "2.0", "event_id": event_id, "correlation_id": "correlation:0001", "event_type": "observation", "data": {"quality": "ok"}, "retry": retry}


class StreamPipelineTests(SimpleTestCase):
    def setUp(self): self.redis = FakeRedis(); self.pipeline = StreamPipeline(self.redis, max_retries=2)

    def encoded(self, value): return {key: json.dumps(item, separators=(",", ":")) for key, item in value.items()}

    def test_success_is_idempotent(self):
        calls = []
        fields = self.encoded(payload())
        self.assertEqual(self.pipeline.process("workers", "1-0", fields, calls.append), "processed")
        self.assertEqual(self.pipeline.process("workers", "2-0", fields, calls.append), "duplicate")
        self.assertEqual(len(calls), 1)

    def test_failure_retries_with_bound(self):
        result = self.pipeline.process("workers", "1-0", self.encoded(payload()), lambda _value: (_ for _ in ()).throw(RuntimeError()))
        self.assertEqual(result, "retry")
        retried = {key: json.loads(value) for key, value in self.redis.streams[self.pipeline.events_stream][0].items()}
        self.assertEqual(retried["retry"], 1)

    def test_poison_message_moves_to_dead_letter_without_content_in_reason(self):
        result = self.pipeline.process("workers", "1-0", self.encoded(payload(retry=2)), lambda _value: (_ for _ in ()).throw(RuntimeError("private-content")))
        self.assertEqual(result, "dead_letter")
        dead = json.loads(self.redis.streams[self.pipeline.dead_stream][0]["payload"])
        self.assertEqual(dead["failure_reason"], "RuntimeError")
        self.assertNotIn("private-content", json.dumps(dead))

    def test_contract_and_ids_are_required(self):
        invalid = payload(); invalid["event_id"] = "short"
        with self.assertRaises(ValueError): self.pipeline.publish(invalid)

    def test_definitive_failure_skips_retries_and_is_classified(self):
        result = self.pipeline.process(
            "workers",
            "1-0",
            self.encoded(payload()),
            lambda _value: (_ for _ in ()).throw(DefinitiveStreamError()),
        )
        self.assertEqual(result, "dead_letter")
        self.assertEqual(len(self.redis.streams.get(self.pipeline.events_stream, [])), 0)
        dead = json.loads(self.redis.streams[self.pipeline.dead_stream][0]["payload"])
        self.assertEqual(dead["failure_classification"], "definitive")
