from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ConsentEvent, Course, DeviceBudgetTelemetry, Enrollment, Session, User
from .retention import expire_due


@override_settings(
    DEVICE_BUDGET_TELEMETRY=True,
    DEVICE_BUDGET_TELEMETRY_TTL_HOURS=24,
    DEVICE_BUDGET_TELEMETRY_MIN_INTERVAL_SECONDS=0,
    CONSENT_V2_ENABLED=True,
    CONSENT_TEXT_APPROVED=True,
    CONSENT_CURRENT_VERSION="test-v1",
    STRICT_EVENT_IDENTITY=True,
)
class DeviceBudgetTelemetryTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="telemetry-student", role=User.ROLE_STUDENT)
        self.other = User.objects.create_user(username="other-student", role=User.ROLE_STUDENT)
        course = Course.objects.create(title="Synthetic Telemetry", owner=self.student)
        Enrollment.objects.create(user=self.student, course=course, status=Enrollment.STATUS_ACTIVE)
        self.session = Session.objects.create(
            course=course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        self.client.force_authenticate(self.student)

    def grant_capture(self):
        for purpose in (ConsentEvent.PURPOSE_LOCAL_PROCESSING, ConsentEvent.PURPOSE_DERIVED_PERSISTENCE):
            ConsentEvent.objects.create(
                participant=self.student,
                purpose=purpose,
                action=ConsentEvent.ACTION_GRANT,
                version="test-v1",
                expires_at=timezone.now() + timedelta(days=1),
            )

    def payload(self):
        return {
            "session_id": self.session.pk,
            "profile": "balanced",
            "profile_generation": 2,
            "device_class": "standard",
            "fps_bucket": "10_to_14",
            "latency_bucket": "50_to_99",
            "memory_bucket": "3_to_4",
            "network_bucket": "slow",
            "cpu_load_bucket": "busy",
            "energy_bucket": "saver",
            "sample_count": 20,
            "invalid_sample_count": 2,
        }

    @override_settings(DEVICE_BUDGET_TELEMETRY=False)
    def test_flag_fails_closed(self):
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", self.payload(), format="json").status_code, 503)

    def test_requires_current_consent_and_owned_active_session(self):
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", self.payload(), format="json").status_code, 403)
        self.grant_capture()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", self.payload(), format="json").status_code, 403)

    def test_persists_only_coarse_short_lived_categories(self):
        self.grant_capture()
        before = timezone.now()
        response = self.client.post("/api/device-budget-telemetry/", self.payload(), format="json")
        self.assertEqual(response.status_code, 201)
        sample = DeviceBudgetTelemetry.objects.get()
        self.assertEqual(sample.course_session, self.session)
        self.assertEqual(sample.network_bucket, "slow")
        self.assertEqual(sample.invalid_sample_count, 2)
        self.assertGreater(sample.expires_at, before + timedelta(hours=23))
        self.assertLess(sample.expires_at, before + timedelta(hours=25))
        stored_fields = {field.name for field in sample._meta.fields}
        for forbidden in ("user", "participant", "device_id", "user_agent", "ip", "demographics"):
            self.assertNotIn(forbidden, stored_fields)

    def test_rejects_fingerprinting_fields_and_impossible_categories(self):
        self.grant_capture()
        payload = self.payload()
        payload["user_agent"] = "precise-browser-build"
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", payload, format="json").status_code, 400)
        payload = self.payload()
        payload["fps_bucket"] = "999"
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", payload, format="json").status_code, 400)
        payload = self.payload()
        payload["sample_count"] = 10000
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", payload, format="json").status_code, 400)
        self.assertFalse(DeviceBudgetTelemetry.objects.exists())

    def test_expired_samples_are_removed_by_retention_job(self):
        self.grant_capture()
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", self.payload(), format="json").status_code, 201)
        DeviceBudgetTelemetry.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        run = expire_due(execute=True)
        self.assertEqual(run.counts["device_budget_samples"], 1)
        self.assertFalse(DeviceBudgetTelemetry.objects.exists())

    @override_settings(DEVICE_BUDGET_TELEMETRY_MIN_INTERVAL_SECONDS=30)
    def test_enforces_short_sampling_rate(self):
        self.grant_capture()
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", self.payload(), format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/device-budget-telemetry/", self.payload(), format="json").status_code, 429)
