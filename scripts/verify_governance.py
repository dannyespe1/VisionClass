"""Validación estándar de los artefactos de gobernanza de P0.5."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = (
    "AGENTS.md",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/ISSUE_TEMPLATE/code.yml",
    ".github/ISSUE_TEMPLATE/operations.yml",
    ".github/ISSUE_TEMPLATE/approval.yml",
    ".github/ISSUE_TEMPLATE/epic.yml",
    ".github/workflows/required-checks.yml",
    "docs/P0.5/BRANCH_PROTECTION.json",
    "docs/P0.5/CATALOGO_PR.md",
    "docs/P0.5/PLAN_TRABAJO.csv",
    "docs/P0.5/PLAN_PR_DETALLADO.json",
    "docs/P0.5/COLISIONES_WORKTREES.csv",
    "docs/P0.5/EPICAS.md",
    "docs/P0.5/GRAFO_DEPENDENCIAS.md",
    "docs/P0.5/INFORME_P0.5.md",
    "docs/P0.5/VERIFICACION.json",
    "docs/P0.5/SHA256.json",
    "scripts/import_execution_plan.py",
    "scripts/update_evidence_hashes.py",
)


def require_files() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    if missing:
        raise SystemExit(f"Faltan artefactos requeridos: {', '.join(missing)}")


def validate_branch_policy() -> None:
    policy = json.loads((ROOT / "docs/P0.5/BRANCH_PROTECTION.json").read_text(encoding="utf-8"))
    if policy["repository"] != "dannyespe1/VisionClass" or policy["branch"] != "main":
        raise SystemExit("La política de rama no apunta al repositorio y rama auditados")
    if policy["applied"] is not False:
        raise SystemExit("No puede marcarse aplicada sin evidencia remota versionada")
    if policy["remote_state"] != "unknown":
        raise SystemExit("El estado remoto solo puede cambiar con evidencia administrativa")
    checks = {item["context"] for item in policy["api_payload"]["required_status_checks"]["checks"]}
    expected = {"governance", "frontend-types", "frontend-build", "backend-checks", "ml-static"}
    if checks != expected:
        raise SystemExit(f"Checks de rama inesperados: {sorted(checks)}")


def validate_plan() -> None:
    with (ROOT / "docs/P0.5/PLAN_TRABAJO.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise SystemExit("PLAN_TRABAJO.csv contiene IDs duplicados")
    expected = {*(f"P0.{n}" for n in range(1, 6)), *(f"G{n}" for n in range(7)), *(f"PR{n:02d}" for n in range(1, 42))}
    if set(ids) != expected:
        missing = sorted(expected - set(ids))
        extra = sorted(set(ids) - expected)
        raise SystemExit(f"Inventario incompleto; faltan={missing}, sobran={extra}")
    known = set(ids)
    by_id = {row["id"]: row for row in rows}
    for row in rows:
        dependencies = [item for item in row["depends_on"].split("|") if item]
        unknown = set(dependencies) - known
        if unknown:
            raise SystemExit(f"{row['id']} depende de IDs desconocidos: {sorted(unknown)}")
        if row["work_type"] not in {"code", "operations", "approval"}:
            raise SystemExit(f"Tipo inválido para {row['id']}: {row['work_type']}")
    if set(by_id["G0"]["depends_on"].split("|")) != {f"P0.{n}" for n in range(1, 6)}:
        raise SystemExit("G0 debe depender de P0.1–P0.5")
    linear = (
        "G0 PR01 PR03 PR07 PR02 PR04 PR05 PR06 G1 PR08 PR09 PR10 PR29 PR30 PR31 G2 "
        "PR11 PR12 PR13 PR33 PR14 PR15 PR16 PR17 PR18 G3 PR19 PR20 PR21 PR22 PR23 PR24 G4 "
        "PR25 PR26 PR27 PR28 PR32 PR34 G5 PR35 PR36 PR37 PR38 PR39 G6 PR40 PR41"
    ).split()
    for predecessor, current in zip(linear, linear[1:]):
        if by_id[current]["depends_on"] != predecessor:
            raise SystemExit(f"Dependencia lineal inválida: {current} debe depender de {predecessor}")

    detail = json.loads((ROOT / "docs/P0.5/PLAN_PR_DETALLADO.json").read_text(encoding="utf-8"))
    prs = detail["prs"]
    expected_prs = {f"PR{number:02d}" for number in range(1, 42)}
    if len(prs) != 41 or {item["id"] for item in prs} != expected_prs:
        raise SystemExit("PLAN_PR_DETALLADO.json no contiene PR01-PR41 exactamente una vez")
    if detail["status"] != "IMPORTED_NOT_APPROVED":
        raise SystemExit("El plan importado no puede declarar aprobación")
    source = detail["source"]
    for kind in ("document", "extraction"):
        if len(source[kind]["sha256"]) != 64:
            raise SystemExit(f"Huella de fuente inválida: {kind}")
    if source["heading_cross_check"] != {
        "document_count": 41,
        "extraction_count": 41,
        "exact_match": True,
    }:
        raise SystemExit("El contraste DOCX/extracción no acredita 41 encabezados idénticos")
    ranks = {f"P0.{number}": -1 for number in range(1, 6)}
    ranks.update({item: index for index, item in enumerate(linear)})
    required = {
        "title", "wave", "owner_suggested", "dependency_text", "objective", "changes", "tests",
        "definition_of_done", "risk", "rollback",
    }
    for item in prs:
        missing = sorted(field for field in required if not item.get(field))
        if missing:
            raise SystemExit(f"Alcance incompleto en {item['id']}: {missing}")
        if by_id[item["id"]]["detailed_scope"] != "true":
            raise SystemExit(f"{item['id']} no está marcado con alcance detallado")
        if by_id[item["id"]]["title"] != item["title"]:
            raise SystemExit(f"Título inconsistente en {item['id']}")
        for dependency in item["repository_dependencies"]:
            if dependency not in ranks or ranks[dependency] >= ranks[item["id"]]:
                raise SystemExit(f"Dependencia fuera del orden aprobado: {dependency} -> {item['id']}")


def validate_collisions() -> None:
    with (ROOT / "docs/P0.5/COLISIONES_WORKTREES.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if not rows or not any(row["coordination"] == "serializar" for row in rows):
        raise SystemExit("No hay grupos de colisión serializados")


def validate_checksums() -> None:
    checksum_path = ROOT / "docs/P0.5/SHA256.json"
    manifest = json.loads(checksum_path.read_text(encoding="utf-8-sig"))
    expected_files = {path.name for path in checksum_path.parent.iterdir() if path.is_file() and path.name != checksum_path.name}
    recorded_files = {item["path"] for item in manifest["files"]}
    if recorded_files != expected_files:
        raise SystemExit("SHA256.json no cubre exactamente los artefactos P0.5")
    for item in manifest["files"]:
        digest = hashlib.sha256((checksum_path.parent / item["path"]).read_bytes()).hexdigest()
        if digest != item["sha256"]:
            raise SystemExit(f"Checksum inválido: {item['path']}")


if __name__ == "__main__":
    require_files()
    validate_branch_policy()
    validate_plan()
    validate_collisions()
    validate_checksums()
    print("Gobernanza P0.5: estructura válida")
