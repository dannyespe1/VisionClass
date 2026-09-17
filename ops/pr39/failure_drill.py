#!/usr/bin/env python3
import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request

from common import assert_local_url, write_json


ALLOWED_SERVICES = {
    "instance": ("backend", "/api/health/live/"),
    "database": ("db", "/api/health/ready/"),
    "redis_queue": ("redis", "/api/health/ready/"),
    "model": ("ml", "/health"),
}


def compose(project, file_name, *args):
    return subprocess.run(
        ["docker", "compose", "-p", project, "-f", file_name, *args],
        check=True,
        text=True,
        capture_output=True,
    )


def available(url, timeout=1):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return 200 <= response.status < 400
    except (urllib.error.URLError, TimeoutError):
        return False


def wait_for(url, expected, timeout):
    started = time.perf_counter()
    while time.perf_counter() - started < timeout:
        if available(url) is expected:
            return round(time.perf_counter() - started, 3)
        time.sleep(0.25)
    raise RuntimeError(f"El endpoint no alcanzó available={expected} antes de {timeout}s")


def main():
    parser = argparse.ArgumentParser(description="Fallos PR39 sólo sobre Compose aislado")
    parser.add_argument("--project", required=True)
    parser.add_argument("--compose-file", required=True)
    parser.add_argument("--failure", choices=ALLOWED_SERVICES, required=True)
    parser.add_argument("--backend-url", default="http://127.0.0.1:18000")
    parser.add_argument("--ml-url", default="http://127.0.0.1:19000")
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--confirm-isolated", action="store_true")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if not args.confirm_isolated or not args.project.startswith("visionclass-pr39-"):
        parser.error("requiere --confirm-isolated y proyecto con prefijo visionclass-pr39-")

    backend_url = assert_local_url(args.backend_url)
    ml_url = assert_local_url(args.ml_url)
    service, path = ALLOWED_SERVICES[args.failure]
    probe_url = f"{ml_url if args.failure == 'model' else backend_url}{path}"
    if not available(probe_url):
        raise RuntimeError("El entorno aislado no está saludable antes del drill")

    compose(args.project, args.compose_file, "stop", service)
    try:
        detection = wait_for(probe_url, False, args.timeout)
    finally:
        recovery_started = time.perf_counter()
        compose(args.project, args.compose_file, "start", service)
    recovery = wait_for(probe_url, True, args.timeout)
    payload = {
        "schema_version": "1.0",
        "environment": "isolated_compose",
        "failure": args.failure,
        "service": service,
        "failure_detected_seconds": detection,
        "recovery_seconds": round(time.perf_counter() - recovery_started, 3),
        "probe_recovery_seconds": recovery,
        "real_data_used": False,
    }
    write_json(args.output, payload)
    print(json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
