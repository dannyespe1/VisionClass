import unittest

from distributed_state import DistributedStateStore, SessionIdentity


class FakePipeline:
    def __init__(self, client): self.client = client
    def __enter__(self): return self
    def __exit__(self, *_args): return False
    def watch(self, _key): return None
    def unwatch(self): return None
    def get(self, key): return self.client.get(key)
    def multi(self): return None
    def set(self, key, value, ex=None): self.client.set(key, value, ex=ex)
    def execute(self): return []


class FakeRedis:
    def __init__(self): self.values = {}; self.ttls = {}
    def set(self, key, value, ex=None): self.values[key] = value; self.ttls[key] = ex
    def get(self, key): return self.values.get(key)
    def expire(self, key, ttl): self.ttls[key] = ttl
    def delete(self, key): self.values.pop(key, None)
    def pipeline(self): return FakePipeline(self)


class DistributedStateTests(unittest.TestCase):
    def setUp(self):
        self.redis = FakeRedis()
        self.store = DistributedStateStore(self.redis, "visionclass:test", "s" * 32, 120)

    def test_keys_do_not_expose_identifiers_or_mix_sessions(self):
        first = SessionIdentity("participant-1", "course-1", "session-1")
        second = SessionIdentity("participant-2", "course-1", "session-1")
        self.assertNotEqual(self.store.key_for(first), self.store.key_for(second))
        self.assertNotIn("participant-1", self.store.key_for(first))

    def test_state_survives_store_recreation_and_renews_ttl(self):
        identity = SessionIdentity("p", "c", "s")
        self.store.save(identity, {"window_position": 2, "quality": {"observable": True}, "model_version": "m1", "revision": 1})
        recreated = DistributedStateStore(self.redis, "visionclass:test", "s" * 32, 120)
        self.assertEqual(recreated.load(identity)["window_position"], 2)
        self.assertEqual(self.redis.ttls[recreated.key_for(identity)], 120)

    def test_compare_and_set_rejects_stale_writer(self):
        identity = SessionIdentity("p", "c", "s")
        self.store.save(identity, {"window_position": 1, "quality": {}, "model_version": "m1", "revision": 1})
        self.assertFalse(self.store.compare_and_set(identity, 0, {"window_position": 2, "quality": {}, "model_version": "m1", "revision": 1}))
        self.assertTrue(self.store.compare_and_set(identity, 1, {"window_position": 2, "quality": {}, "model_version": "m1", "revision": 2}))


if __name__ == "__main__": unittest.main()
