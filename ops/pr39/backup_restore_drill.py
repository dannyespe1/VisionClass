#!/usr/bin/env python3
import argparse
import json
import subprocess
import time
import uuid

from common import write_json


def docker(*args, capture=False, check=True):
    return subprocess.run(
        ["docker", *args],
        check=check,
        text=True,
        capture_output=capture,
    )


def scalar(container, database, sql):
    result = docker(
        "exec", container, "psql", "-U", "pr39", "-d", database,
        "-At", "-v", "ON_ERROR_STOP=1", "-c", sql, capture=True,
    )
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser(description="Drill aislado de backup/restore PostgreSQL")
    parser.add_argument("--confirm-isolated", action="store_true")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if not args.confirm_isolated:
        parser.error("se requiere --confirm-isolated; nunca usa una base existente")

    suffix = uuid.uuid4().hex[:10]
    container = f"visionclass-pr39-backup-{suffix}"
    volume = f"visionclass-pr39-backup-{suffix}"
    started = time.perf_counter()
    try:
        docker("volume", "create", volume, capture=True)
        docker(
            "run", "-d", "--name", container,
            "-e", "POSTGRES_USER=pr39", "-e", "POSTGRES_PASSWORD=synthetic-only",
            "-e", "POSTGRES_DB=source", "-v", f"{volume}:/var/lib/postgresql/data",
            "postgres:15", capture=True,
        )
        for _ in range(60):
            ready = docker(
                "exec", container, "psql", "-U", "pr39", "-d", "source",
                "-At", "-c", "SELECT 1", check=False, capture=True,
            )
            if ready.returncode == 0 and ready.stdout.strip() == "1":
                break
            time.sleep(1)
        else:
            raise RuntimeError("PostgreSQL sintético no estuvo listo en 60 segundos")

        scalar(container, "source", "CREATE TABLE synthetic_events(id integer PRIMARY KEY, value text NOT NULL);")
        scalar(container, "source", "INSERT INTO synthetic_events SELECT n, md5(n::text) FROM generate_series(1,100) n;")
        source_digest = scalar(container, "source", "SELECT md5(string_agg(id::text || ':' || value, ',' ORDER BY id)) FROM synthetic_events;")
        docker("exec", container, "pg_dump", "-U", "pr39", "-Fc", "-f", "/tmp/source.dump", "source")
        scalar(container, "postgres", "CREATE DATABASE restored;")
        docker("exec", container, "pg_restore", "-U", "pr39", "-d", "restored", "--exit-on-error", "/tmp/source.dump")
        restored_digest = scalar(container, "restored", "SELECT md5(string_agg(id::text || ':' || value, ',' ORDER BY id)) FROM synthetic_events;")
        restored_count = int(scalar(container, "restored", "SELECT count(*) FROM synthetic_events;"))
        payload = {
            "schema_version": "1.0",
            "environment": "ephemeral_synthetic_postgres",
            "rows": restored_count,
            "integrity_match": source_digest == restored_digest,
            "duration_seconds": round(time.perf_counter() - started, 3),
            "real_data_used": False,
        }
        write_json(args.output, payload)
        print(json.dumps(payload, sort_keys=True))
        raise SystemExit(0 if payload["integrity_match"] and restored_count == 100 else 2)
    finally:
        docker("rm", "-f", container, check=False)
        docker("volume", "rm", "-f", volume, check=False)


if __name__ == "__main__":
    main()
