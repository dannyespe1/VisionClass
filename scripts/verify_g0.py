"""Comprueba integridad y condiciones técnicas observables de la Puerta G0."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def verify_p0_manifest(name: str) -> int:
    directory = ROOT / "docs" / name
    manifest = load_json(directory / "SHA256.json")
    entries = manifest.get("files")
    if entries is None:
        entries = [{"path": path, "sha256": digest} for path, digest in manifest.items()]
    for entry in entries:
        path = Path(entry["path"])
        if not path.is_absolute() and not (ROOT / path).is_file():
            path = directory / path.name
        elif not path.is_absolute():
            path = ROOT / path
        if not path.is_file():
            raise SystemExit(f"Falta evidencia {name}: {entry['path']}")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest.lower() != entry["sha256"].lower():
            raise SystemExit(f"Checksum inválido {name}: {entry['path']}")
    return len(entries)


def verify_g0_manifest() -> int:
    directory = ROOT / "docs" / "G0"
    manifest = load_json(directory / "SHA256.json")
    expected = {path.name for path in directory.iterdir() if path.is_file() and path.name != "SHA256.json"}
    recorded = {entry["path"] for entry in manifest["files"]}
    if recorded != expected:
        raise SystemExit(f"Manifiesto G0 incompleto: esperado={sorted(expected)}, registrado={sorted(recorded)}")
    for entry in manifest["files"]:
        path = directory / entry["path"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise SystemExit(f"Checksum inválido G0: {entry['path']}")
    return len(recorded)


def csv_rows(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def validate_gate_facts() -> None:
    g0 = ROOT / "docs" / "G0"
    verification = load_json(g0 / "VERIFICACION.json")
    if verification["verdict"] != "BLOQUEADA" or verification["approval_claim"]:
        raise SystemExit("G0 no puede declararse aprobada por esta evidencia")

    matrix = csv_rows(g0 / "MATRIZ_G0.csv")
    if len(matrix) != 10 or len({row["criterion"] for row in matrix}) != 10:
        raise SystemExit("La matriz G0 debe contener diez criterios únicos")
    actions = csv_rows(g0 / "ACCIONES_TECNICAS.csv")
    if len(actions) != 8:
        raise SystemExit("El registro técnico G0 debe contener ocho acciones")

    prereg = load_json(ROOT / "docs/P0.3/PREREGISTRO_CONFIRMATORIO.json")
    if prereg["status"] != "FROZEN_CANDIDATE_PENDING_INDEPENDENT_RATIFICATION":
        raise SystemExit("Cambió el estado del preregistro; G0 requiere reevaluación")
    p03 = load_json(ROOT / "docs/P0.3/VERIFICACION.json")
    if p03["approval_blockers"] != ["D01", "D03", "D05", "D08"]:
        raise SystemExit("Conteo inesperado de bloqueos P0.3")

    gates = csv_rows(ROOT / "docs/P0.4/REGISTRO_GATES.csv")
    if sum(row["status"] == "BLOCKED" for row in gates) != 7:
        raise SystemExit("Conteo inesperado de gates P0.4 bloqueados")

    plan = csv_rows(ROOT / "docs/P0.5/PLAN_TRABAJO.csv")
    if sum(row["detailed_scope"] == "false" for row in plan) != 0:
        raise SystemExit("Existen PR sin alcance detallado en PLAN_TRABAJO.csv")
    detail = load_json(ROOT / "docs/P0.5/PLAN_PR_DETALLADO.json")
    if len(detail["prs"]) != 41 or len({item["id"] for item in detail["prs"]}) != 41:
        raise SystemExit("El plan detallado no contiene 41 PR únicos")
    if detail["status"] != "IMPORTED_NOT_APPROVED":
        raise SystemExit("El plan importado no puede declarar aprobación")
    if next(row for row in plan if row["id"] == "G0")["status"] != "BLOCKED":
        raise SystemExit("PLAN_TRABAJO.csv debe concordar con el veredicto G0")

    policy = load_json(ROOT / "docs/P0.5/BRANCH_PROTECTION.json")
    if policy["applied"] or policy["remote_state"] != "unknown":
        raise SystemExit("La política remota cambió sin actualizar el acta G0")

    decisions = load_json(g0 / "DECISIONES_G0_SANITIZADAS.json")
    if decisions["source"]["sha256"] != "267e4c8869683610a125c65471b2e3fd0cfebb6a6ef2a156e328dc4e77942349":
        raise SystemExit("La fuente del formulario G0 no coincide con la huella aprobada")
    if decisions["gate"]["verdict"] != "BLOQUEADA" or decisions["gate"]["participants_authorized"] != 0:
        raise SystemExit("El formulario no puede autorizar G0 ni participantes")
    if decisions["sanitization"]["personal_contact_copied"]:
        raise SystemExit("El registro saneado declara haber copiado datos de contacto")
    serialized = json.dumps(decisions, ensure_ascii=False).lower()
    if "@espe" in serialized or "mailto:" in serialized:
        raise SystemExit("El registro saneado contiene un contacto personal")

    action_status = {row["id"]: row["status"] for row in actions}
    expected_actions = {
        "T-G0-01": "READY_FOR_IMPLEMENTATION",
        "T-G0-02": "AUTHORIZED_WAITING_DEP_FE",
        "T-G0-03": "AUTHORIZED_WAITING_DEP_BE",
    }
    if any(action_status.get(key) != value for key, value in expected_actions.items()):
        raise SystemExit("El orden autorizado DEP-FE -> DEP-BE -> DEP-ML no está registrado")


def validate_dependency_evidence() -> None:
    directory = ROOT / "docs/G0"
    npm_audit = load_json(directory / "npm-audit-2026-09-13.json")
    counts = npm_audit["metadata"]["vulnerabilities"]
    if counts != {"info": 0, "low": 1, "moderate": 4, "high": 11, "critical": 1, "total": 17}:
        raise SystemExit(f"Resumen npm audit inesperado: {counts}")

    outdated = load_json(directory / "npm-outdated-2026-09-13.json")
    if len(outdated) != 48:
        raise SystemExit(f"Conteo npm outdated inesperado: {len(outdated)}")

    backend = load_json(directory / "pip-audit-backend-2026-09-13.json")
    affected = [item for item in backend["dependencies"] if item["vulns"]]
    if len(backend["dependencies"]) != 35 or len(affected) != 9 or sum(len(item["vulns"]) for item in affected) != 109:
        raise SystemExit("Resumen pip-audit backend inesperado")

    ml = load_json(directory / "pip-audit-ml-2026-09-13.json")
    if ml["status"] != "NOT_RESOLVED" or len(ml["unpinned_requirements"]) != 10:
        raise SystemExit("Resumen pip-audit ML inesperado")


if __name__ == "__main__":
    p0_files = sum(verify_p0_manifest(name) for name in ("P0.1", "P0.2", "P0.3", "P0.4", "P0.5"))
    g0_files = verify_g0_manifest()
    validate_gate_facts()
    validate_dependency_evidence()
    print(f"G0 verificada: BLOQUEADA; P0_files={p0_files}; G0_files={g0_files}")
