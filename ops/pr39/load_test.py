#!/usr/bin/env python3
import argparse
import concurrent.futures
import json
import time
import urllib.error
import urllib.request
import uuid

from common import assert_local_url, percentile, write_json


PROFILES = {
    "target": {"requests": 200, "concurrency": 10},
    "peak": {"requests": 400, "concurrency": 25},
}


def wait_until_ready(base_url, timeout=60):
    base_url = assert_local_url(base_url)
    url = f"{base_url}/api/health/ready/"
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        status, _ = request_once(url, 2, uuid.uuid4().hex, 0)
        if 200 <= status < 400:
            return
        time.sleep(0.25)
    raise RuntimeError(f"El destino loopback no estuvo listo en {timeout} segundos")


def request_once(url, timeout, run_id, number):
    request = urllib.request.Request(
        url,
        headers={
            "X-Correlation-ID": str(
                uuid.uuid5(uuid.NAMESPACE_URL, f"visionclass-pr39:{run_id}:{number}")
            )
        },
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read(1024)
            status = response.status
    except urllib.error.HTTPError as exc:
        status = exc.code
    except (urllib.error.URLError, TimeoutError):
        status = 0
    return status, (time.perf_counter() - started) * 1000


def run(base_url, profile_name, requests, concurrency, timeout):
    base_url = assert_local_url(base_url)
    run_id = uuid.uuid4().hex
    url = f"{base_url}/api/health/ready/"
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        results = list(
            executor.map(
                lambda number: request_once(url, timeout, run_id, number),
                range(requests),
            )
        )
    elapsed = time.perf_counter() - started
    latencies = [latency for _, latency in results]
    successes = sum(1 for status, _ in results if 200 <= status < 400)
    return {
        "schema_version": "1.0",
        "profile": profile_name,
        "destination": "loopback",
        "requests": requests,
        "concurrency": concurrency,
        "successes": successes,
        "errors": requests - successes,
        "error_rate": round((requests - successes) / requests, 6),
        "throughput_rps": round(requests / elapsed, 3),
        "latency_ms": {
            "p50": percentile(latencies, 0.50),
            "p95": percentile(latencies, 0.95),
            "p99": percentile(latencies, 0.99),
            "max": round(max(latencies), 3),
        },
        "elapsed_seconds": round(elapsed, 3),
    }


def main():
    parser = argparse.ArgumentParser(description="Carga PR39 limitada a loopback")
    parser.add_argument("--base-url", default="http://127.0.0.1:18000")
    parser.add_argument("--profile", choices=PROFILES, required=True)
    parser.add_argument("--requests", type=int)
    parser.add_argument("--concurrency", type=int)
    parser.add_argument("--timeout", type=float, default=5)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    defaults = PROFILES[args.profile]
    requests = args.requests or defaults["requests"]
    concurrency = args.concurrency or defaults["concurrency"]
    if requests < 1 or concurrency < 1 or concurrency > requests:
        parser.error("requests y concurrency deben ser positivos; concurrency no puede exceder requests")
    wait_until_ready(args.base_url)
    result = run(args.base_url, args.profile, requests, concurrency, args.timeout)
    write_json(args.output, result)
    print(json.dumps(result, sort_keys=True))
    raise SystemExit(0 if result["errors"] == 0 else 2)


if __name__ == "__main__":
    main()
