import unittest
import uuid

from ml.study_cohort_plan import CohortPlanError, create_cohort_plan


class StudyCohortPlanTests(unittest.TestCase):
    def setUp(self):
        namespace = uuid.UUID("ba5ee393-7d11-4f7e-a74a-230af96c552f")
        self.pilot = [str(uuid.uuid5(namespace, f"pilot-{index:03d}")) for index in range(1, 16)]
        self.study = [str(uuid.uuid5(namespace, f"study-{index:03d}")) for index in range(1, 101)]

    def plan(self, development_size=60):
        return create_cohort_plan(
            pilot_pseudonyms=self.pilot,
            study_pseudonyms=self.study,
            development_size=development_size,
            seed_reference="preregistered-seed-v1",
        )

    def test_accepts_only_the_approved_participant_splits(self):
        plan_60 = self.plan(60)
        plan_70 = self.plan(70)
        self.assertEqual((len(plan_60.development), len(plan_60.confirmatory)), (60, 40))
        self.assertEqual((len(plan_70.development), len(plan_70.confirmatory)), (70, 30))
        with self.assertRaisesRegex(CohortPlanError, "60_40_or_70_30"):
            self.plan(65)

    def test_pilot_is_separate_and_size_is_bounded(self):
        with self.assertRaisesRegex(CohortPlanError, "between_15_and_20"):
            create_cohort_plan(
                pilot_pseudonyms=self.pilot[:14],
                study_pseudonyms=self.study,
                development_size=60,
                seed_reference="preregistered-seed-v1",
            )
        with self.assertRaisesRegex(CohortPlanError, "reuse_forbidden"):
            create_cohort_plan(
                pilot_pseudonyms=[*self.pilot[:-1], self.study[0]],
                study_pseudonyms=self.study,
                development_size=60,
                seed_reference="preregistered-seed-v1",
            )

    def test_split_is_participant_exclusive_and_reproducible(self):
        first = self.plan(70)
        second = self.plan(70)
        self.assertEqual(first, second)
        self.assertFalse(set(first.development) & set(first.confirmatory))
        self.assertFalse(set(first.pilot) & set(first.development))
        self.assertFalse(set(first.pilot) & set(first.confirmatory))

    def test_rejects_direct_identifiers_and_duplicate_pseudonyms(self):
        direct = list(self.study)
        direct[0] = "student@example.com"
        with self.assertRaisesRegex(CohortPlanError, "direct_identifier"):
            create_cohort_plan(
                pilot_pseudonyms=self.pilot,
                study_pseudonyms=direct,
                development_size=60,
                seed_reference="preregistered-seed-v1",
            )
        duplicate = list(self.study)
        duplicate[-1] = duplicate[0]
        with self.assertRaisesRegex(CohortPlanError, "duplicate_pseudonym"):
            create_cohort_plan(
                pilot_pseudonyms=self.pilot,
                study_pseudonyms=duplicate,
                development_size=60,
                seed_reference="preregistered-seed-v1",
            )

    def test_public_manifest_contains_no_participant_identifiers(self):
        manifest = self.plan(60).public_manifest()
        rendered = str(manifest)
        self.assertEqual(manifest["pilot_participants"], 15)
        self.assertEqual(manifest["study_participants"], 100)
        self.assertNotIn(self.pilot[0], rendered)
        self.assertNotIn(self.study[0], rendered)
        self.assertFalse(manifest["pilot_reuse_permitted"])
        self.assertFalse(manifest["confirmatory_access_before_model_freeze"])


if __name__ == "__main__":
    unittest.main()
