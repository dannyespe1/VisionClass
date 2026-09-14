"""Regenera manifiestos SHA-256 de evidencia P0.5 y G0."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def update_manifest(relative_directory: str, generated_at: str) -> int:
    directory = ROOT / relative_directory
    files = sorted(path for path in directory.iterdir() if path.is_file() and path.name != "SHA256.json")
    payload = {
        "schema_version": 1,
        "generated_at": generated_at,
        "files": [
            {"path": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in files
        ],
    }
    (directory / "SHA256.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return len(files)


if __name__ == "__main__":
    counts = {
        name: update_manifest(f"docs/{name}", "2026-09-14")
        for name in ("P0.1", "P0.2", "P0.3", "P0.4", "P0.5", "G0")
    }
    print("Manifiestos actualizados: " + "; ".join(f"{name}={count}" for name, count in counts.items()))
