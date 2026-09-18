from django.conf import settings
from django.test import SimpleTestCase


class PilotCandidateSafetyTests(SimpleTestCase):
    def test_candidate_and_pending_modules_are_off_by_default(self):
        self.assertFalse(settings.PILOT_RELEASE)
        self.assertFalse(settings.STUDENT_ATTENTION_DASHBOARD)
        self.assertFalse(settings.TEACHER_GROUP_DASHBOARD)
        self.assertFalse(settings.RESEARCH_DASHBOARD)
        self.assertFalse(settings.CONSERVATIVE_INTERVENTIONS)

    def test_candidate_keeps_unapproved_model_allowlist_empty(self):
        self.assertEqual(settings.INTERVENTION_ALLOWED_MODEL_REFERENCES, ())
