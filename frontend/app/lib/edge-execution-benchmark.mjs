const finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

export const EDGE_LANE_BENCHMARK_SAMPLES = 6;
export const EDGE_LANE_WARMUP_SAMPLES = 3;

const percentile = (values, fraction) => {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
};

export class EdgeExecutionBenchmark {
  constructor({ samplesPerLane = EDGE_LANE_BENCHMARK_SAMPLES, warmupSamplesPerLane = EDGE_LANE_WARMUP_SAMPLES } = {}) {
    this.samplesPerLane = samplesPerLane;
    this.warmupSamplesPerLane = warmupSamplesPerLane;
    this.warmups = { main: 0, worker: 0 };
    this.records = { main: [], worker: [] };
    this.selectedLane = null;
  }

  nextLane() {
    if (this.selectedLane) return this.selectedLane;
    const mainCount = this.records.main.length;
    const workerCount = this.records.worker.length;
    if (mainCount >= this.samplesPerLane && workerCount >= this.samplesPerLane) {
      this.selectedLane = selectEdgeExecutionLane(this.summary());
      return this.selectedLane;
    }
    const mainProgress = this.warmups.main + mainCount;
    const workerProgress = this.warmups.worker + workerCount;
    return mainProgress <= workerProgress ? "main" : "worker";
  }

  record(lane, { totalMs, mainThreadMs, observable }) {
    if (!this.records[lane] || !finite(totalMs) || !finite(mainThreadMs)) return false;
    if (this.selectedLane) return false;
    if (this.warmups[lane] < this.warmupSamplesPerLane) {
      this.warmups[lane] += 1;
      return true;
    }
    this.records[lane].push({ totalMs, mainThreadMs, observable: observable === true });
    if (!this.selectedLane && this.records.main.length >= this.samplesPerLane && this.records.worker.length >= this.samplesPerLane) {
      this.selectedLane = selectEdgeExecutionLane(this.summary());
    }
    return true;
  }

  summary() {
    const lanes = Object.fromEntries(Object.entries(this.records).map(([lane, records]) => [lane, {
      samples: records.length,
      total_ms_p50: percentile(records.map((record) => record.totalMs), 0.5),
      total_ms_p95: percentile(records.map((record) => record.totalMs), 0.95),
      main_thread_ms_p95: percentile(records.map((record) => record.mainThreadMs), 0.95),
      coverage: records.length ? records.filter((record) => record.observable).length / records.length : null,
    }]));
    return {
      selected_lane: this.selectedLane,
      samples_per_lane: this.samplesPerLane,
      warmup_samples_per_lane: this.warmupSamplesPerLane,
      warmup_discarded: { ...this.warmups },
      lanes,
    };
  }
}

export function selectEdgeExecutionLane(summary) {
  const main = summary?.lanes?.main;
  const worker = summary?.lanes?.worker;
  if (!main || !worker || main.samples < 1 || worker.samples < 1) return "main";
  const comparableCoverage = worker.coverage !== null && main.coverage !== null && worker.coverage >= main.coverage - 0.05;
  const protectsMainThread = worker.main_thread_ms_p95 !== null && main.main_thread_ms_p95 !== null
    && worker.main_thread_ms_p95 <= Math.max(8, main.main_thread_ms_p95 * 0.75);
  const acceptableEndToEnd = worker.total_ms_p95 !== null && main.total_ms_p95 !== null
    && worker.total_ms_p95 <= Math.max(main.total_ms_p95 * 1.5, main.total_ms_p95 + 25);
  return comparableCoverage && protectsMainThread && acceptableEndToEnd ? "worker" : "main";
}
