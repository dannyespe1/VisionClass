"""Valida el ADR candidato y la matriz de arquitectura de PR01."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "docs/PR01"
ADR = DIRECTORY / "ADR-0001-ARQUITECTURA-OBJETIVO.md"
COMPONENTS = DIRECTORY / "COMPONENTES_ARQUITECTURA.csv"
EXPECTED_COMPONENTS = {
    "edge-browser",
    "next-bff",
    "django-api",
    "redis-streams",
    "temporal-engine",
    "postgresql",
    "model-registry",
    "demographic-vault",
    "ml-service",
}
TEXT_SUFFIXES = {".md", ".txt", ".csv", ".json", ".py", ".yml", ".yaml"}


def evidence_digest(path: Path) -> str:
    raw = path.read_bytes()
    if path.suffix.lower() in TEXT_SUFFIXES:
        text = raw.decode("utf-8-sig")
        raw = text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def validate_adr() -> None:
    text = ADR.read_text(encoding="utf-8")
    required_sections = (
        "## Decisión y límite de autoridad",
        "## Diagrama lógico",
        "## Componentes, entradas, salidas y propietarios",
        "## Datos permitidos y prohibidos",
        "## Identidad, secretos y acceso",
        "## Secuencia de migración D2R",
        "## Alternativas descartadas",
        "## Consecuencias",
        "## Riesgos y tratamiento mínimo",
        "## Rollback",
        "## Criterios de aceptación",
    )
    missing = [section for section in required_sections if section not in text]
    if missing:
        raise SystemExit(f"ADR incompleto: {missing}")
    required_tokens = (
        "CANDIDATA — BLOQUEADA POR G0",
        "cero participantes autorizados",
        "Redis Streams",
        "Bóveda demográfica",
        "PROHIBIDO: material crudo",
        "PR41",
        "no_observable",
        "Django REST",
    )
    absent = [token for token in required_tokens if token not in text]
    if absent:
        raise SystemExit(f"ADR sin invariantes: {absent}")


def validate_components() -> None:
    with COMPONENTS.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != 9 or {row["component_id"] for row in rows} != EXPECTED_COMPONENTS:
        raise SystemExit("La matriz debe contener los nueve componentes objetivo una vez")
    required = (
        "name", "trust_zone", "owner", "allowed_input", "allowed_output", "source_of_truth",
        "forbidden_data", "planned_prs", "status",
    )
    for row in rows:
        missing = [field for field in required if not row[field]]
        if missing:
            raise SystemExit(f"Componente incompleto {row['component_id']}: {missing}")
        if row["status"] != "CANDIDATE_BLOCKED_G0":
            raise SystemExit(f"Componente declara estado indebido: {row['component_id']}")


def validate_links_and_privacy() -> None:
    markdown_files = [ADR, ROOT / "docs/P0.5/EPICAS.md"]
    for path in markdown_files:
        text = path.read_text(encoding="utf-8")
        for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", text):
            if "://" in target or target.startswith("#"):
                continue
            resolved = (path.parent / target.split("#", 1)[0]).resolve()
            if not resolved.is_file():
                raise SystemExit(f"Enlace local roto: {path.relative_to(ROOT)} -> {target}")
    corpus = "\n".join(
        path.read_text(encoding="utf-8")
        for path in DIRECTORY.glob("*.*")
        if path.name != "SHA256.json"
    )
    if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", corpus):
        raise SystemExit("PR01 contiene una dirección de correo")
    forbidden = ("SECRET_KEY=", "Bearer ey", "BEGIN PRIVATE KEY", "password=")
    if any(token.lower() in corpus.lower() for token in forbidden):
        raise SystemExit("PR01 contiene material con apariencia de secreto")


def validate_status_and_manifest() -> None:
    verification = json.loads((DIRECTORY / "VERIFICACION.json").read_text(encoding="utf-8"))
    if verification["status"] != "CANDIDATE_BLOCKED_G0" or verification["approval_claim"]:
        raise SystemExit("PR01 no puede declarar aprobación con G0 bloqueada")
    manifest = json.loads((DIRECTORY / "SHA256.json").read_text(encoding="utf-8"))
    expected = {path.name for path in DIRECTORY.iterdir() if path.is_file() and path.name != "SHA256.json"}
    recorded = {item["path"] for item in manifest["files"]}
    if expected != recorded:
        raise SystemExit("SHA256.json no cubre exactamente los artefactos PR01")
    for item in manifest["files"]:
        digest = evidence_digest(DIRECTORY / item["path"])
        if digest != item["sha256"]:
            raise SystemExit(f"Checksum inválido PR01: {item['path']}")


if __name__ == "__main__":
    validate_adr()
    validate_components()
    validate_links_and_privacy()
    validate_status_and_manifest()
    print("PR01 arquitectura candidata: estructura válida; G0 BLOQUEADA")
