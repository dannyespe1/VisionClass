import csv
import json
import tempfile
import unittest
from pathlib import Path

from ml.benchmark_pareto import aggregate_runs, pareto_frontier, recommendations, synthetic_runs, validate_runs
from ml.run_benchmark_pareto import load_config, run


class BenchmarkParetoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).resolve().parents[1]
        cls.config_path = cls.root / "ml" / "config" / "pr28_benchmark_v1.json"
        cls.config = load_config(cls.config_path)

    def test_matrix_is_complete_repeated_and_deterministic(self):
        first = synthetic_runs(self.config)
        second = synthetic_runs(self.config)
        self.assertEqual(first, second)
        self.assertEqual(len(first), 3 * 3 * 3 * 2 * self.config["repetitions"])
        self.assertEqual(len({row["scenario_id"] for row in first}), 54)
        validate_runs(first, self.config)

    def test_conditions_units_and_privacy_are_enforced(self):
        rows = synthetic_runs(self.config)
        bad = [dict(row) for row in rows]
        bad[0]["temperature_c"] = 90
        with self.assertRaisesRegex(ValueError, "temperature_out_of_control"):
            validate_runs(bad, self.config)
        bad = [dict(row) for row in rows]
        bad[0]["latency_ms_p95"] = -1
        with self.assertRaisesRegex(ValueError, "invalid_latency_units"):
            validate_runs(bad, self.config)
        bad = [dict(row) for row in rows]
        bad[0]["raw_media_transmitted"] = True
        with self.assertRaisesRegex(ValueError, "raw_media_not_permitted"):
            validate_runs(bad, self.config)

    def test_incomplete_matrix_and_mixed_provenance_are_rejected(self):
        rows = synthetic_runs(self.config)
        missing_scenario = rows[0]["scenario_id"]
        incomplete = [row for row in rows if row["scenario_id"] != missing_scenario]
        with self.assertRaisesRegex(ValueError, "incomplete_benchmark_matrix"):
            validate_runs(incomplete, self.config)
        mixed = [dict(row) for row in rows]
        mixed[0]["data_classification"] = "controlled_device_benchmark"
        with self.assertRaisesRegex(ValueError, "mixed_data_classification"):
            validate_runs(mixed, self.config)

    def test_fallback_cannot_claim_predictive_performance(self):
        rows = synthetic_runs(self.config)
        fallback = next(row for row in rows if row["inference_location"] == "local_fallback")
        fallback["balanced_accuracy"] = 0.99
        with self.assertRaisesRegex(ValueError, "fallback_cannot_claim_predictive_performance"):
            validate_runs(rows, self.config)

    def test_aggregation_reports_uncertainty_conditions_and_units(self):
        aggregates = aggregate_runs(synthetic_runs(self.config), self.config)
        self.assertEqual(len(aggregates), 54)
        sample = next(row for row in aggregates if row["inference_location"] == "local_device")
        self.assertEqual(sample["metrics"]["latency_ms_p95"]["unit"], "ms")
        self.assertIn("ci95_low", sample["metrics"]["balanced_accuracy"])
        self.assertLessEqual(sample["conditions"]["temperature_c_max"] - sample["conditions"]["temperature_c_min"], 4)

    def test_pareto_and_recommendations_cover_device_classes(self):
        aggregates = aggregate_runs(synthetic_runs(self.config), self.config)
        frontier, dominated = pareto_frontier(aggregates)
        self.assertTrue(frontier)
        self.assertTrue(dominated)
        self.assertFalse(set(row["scenario_id"] for row in frontier) & set(dominated))
        selected = recommendations(frontier, self.config)
        self.assertEqual(set(selected), {"constrained", "standard", "capable"})
        self.assertTrue(all(item["requires_empirical_confirmation"] for item in selected.values()))

    def test_cli_writes_reproducible_dataset_result_and_svg(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            first = run(config_path=self.config_path, output_dir=output, code_version="pr28-test", synthetic=True)
            result_bytes = (output / "SYNTHETIC_BENCHMARK_RESULT.json").read_bytes()
            second = run(config_path=self.config_path, output_dir=output, code_version="pr28-test", synthetic=True)
            self.assertEqual(first, second)
            self.assertEqual(result_bytes, (output / "SYNTHETIC_BENCHMARK_RESULT.json").read_bytes())
            with (output / "SYNTHETIC_BENCHMARK_RUNS.csv").open(encoding="utf-8") as handle:
                self.assertEqual(len(list(csv.DictReader(handle))), 270)
            self.assertIn("Outlined points", (output / "PARETO_FRONTIER.svg").read_text(encoding="utf-8"))
            persisted = json.loads(result_bytes)
            self.assertEqual(persisted["provenance"]["data_classification"], "synthetic_controlled_simulation")
            self.assertEqual(persisted["status"], "SYNTHETIC_ONLY_NOT_EMPIRICAL")

    def test_controlled_input_uses_non_synthetic_artifact_names(self):
        rows = synthetic_runs(self.config)
        for row in rows:
            row["data_classification"] = "controlled_device_benchmark"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "approved-runs.json"
            input_path.write_text(json.dumps({"runs": rows}), encoding="utf-8")
            run(
                config_path=self.config_path,
                output_dir=root / "output",
                code_version="pr28-controlled-test",
                synthetic=False,
                input_path=input_path,
            )
            self.assertTrue((root / "output" / "CONTROLLED_BENCHMARK_RUNS.csv").exists())
            result = json.loads((root / "output" / "CONTROLLED_BENCHMARK_RESULT.json").read_text(encoding="utf-8"))
            self.assertEqual(result["status"], "CONTROLLED_DEVICE_BENCHMARK")


if __name__ == "__main__":
    unittest.main()
