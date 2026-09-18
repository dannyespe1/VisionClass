#!/usr/bin/env python3
import ast
import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "release" / "pilot-candidate" / "candidate.json"


def fail(message):
    print(f"FAIL: {message}")
    return False


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def env_values(path):
    result = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            result[key] = value
    return result


def migration_heads():
    files = {
        path.stem: ast.parse(path.read_text(encoding="utf-8-sig"))
        for path in (ROOT / "backend" / "api" / "migrations").glob("[0-9]*.py")
    }
    depended_on = set()
    for tree in files.values():
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            if not any(isinstance(target, ast.Name) and target.id == "dependencies" for target in node.targets):
                continue
            for dependency in ast.literal_eval(node.value):
                if len(dependency) == 2 and dependency[0] == "api":
                    depended_on.add(dependency[1])
    return sorted(set(files) - depended_on)


def main():
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    ok = True
    if manifest["status"] != "PREPARED_NOT_DEPLOYED" or manifest["pilot_activation"] is not False:
        ok = fail("el candidato no está bloqueado para activación") and ok

    approval = json.loads((ROOT / "docs" / "G6" / "EVIDENCE.json").read_text(encoding="utf-8"))
    if approval["status"] != "APPROVED_FOR_RELEASE_CANDIDATE_ENGINEERING":
        ok = fail("G6 no autoriza ingeniería del candidato") and ok

    for relative, expected in manifest["dependencies"].items():
        if digest(ROOT / relative) != expected:
            ok = fail(f"cambió la dependencia congelada {relative}") and ok

    for relative, model in manifest["models"].items():
        path = ROOT / relative
        if digest(path) != model["sha256"]:
            ok = fail(f"cambió el modelo congelado {relative}") and ok
        if "byte_length" in model and path.stat().st_size != model["byte_length"]:
            ok = fail(f"cambió la longitud del modelo {relative}") and ok

    if migration_heads() != manifest["migration_heads"]:
        ok = fail(f"heads de migración distintos: {migration_heads()}") and ok

    candidate_env = env_values(ROOT / "release" / "pilot-candidate" / "pilot.env")
    false_values = {"false", "0"}
    for flag, expected in manifest["required_flags"].items():
        if expected is not False or candidate_env.get(flag, "").lower() not in false_values:
            ok = fail(f"flag inseguro o ausente: {flag}") and ok

    package = json.loads((ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
    for name, expected in manifest["application_versions"].items():
        if name not in {"next", "axios"}:
            continue
        if package["dependencies"].get(name) != expected:
            ok = fail(f"versión distinta para {name}") and ok

    backend_settings = (ROOT / "backend" / "core" / "settings.py").read_text(encoding="utf-8")
    frontend_features = (ROOT / "frontend" / "app" / "lib" / "features.ts").read_text(encoding="utf-8")
    for flag in ("STUDENT_ATTENTION_DASHBOARD", "TEACHER_GROUP_DASHBOARD", "RESEARCH_DASHBOARD", "CONSERVATIVE_INTERVENTIONS"):
        if not re.search(rf"{flag}\s*=\s*PILOT_RELEASE and", backend_settings):
            ok = fail(f"{flag} no depende de PILOT_RELEASE") and ok
    if frontend_features.count("PILOT_RELEASE_ENABLED &&") != 4:
        ok = fail("los cuatro módulos frontend no dependen del gate global") and ok

    render = (ROOT / "render.yaml").read_text(encoding="utf-8")
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    for key in ("PILOT_RELEASE", "STUDENT_ATTENTION_DASHBOARD", "TEACHER_GROUP_DASHBOARD", "RESEARCH_DASHBOARD", "CONSERVATIVE_INTERVENTIONS"):
        if not re.search(rf"key: {key}\s+value: \"False\"", render):
            ok = fail(f"Render no mantiene {key}=False") and ok
    for key in ("NEXT_PUBLIC_PILOT_RELEASE", "NEXT_PUBLIC_STUDENT_ATTENTION_DASHBOARD", "NEXT_PUBLIC_TEACHER_GROUP_DASHBOARD", "NEXT_PUBLIC_RESEARCH_DASHBOARD", "NEXT_PUBLIC_CONSERVATIVE_INTERVENTIONS"):
        if not re.search(rf"key: {key}\s+value: \"false\"", render):
            ok = fail(f"Render no mantiene {key}=false") and ok
    if "PILOT_RELEASE=False" not in compose or "NEXT_PUBLIC_PILOT_RELEASE=false" not in compose:
        ok = fail("Compose no mantiene apagados los gates globales") and ok
    if "RUN npm ci" not in (ROOT / "frontend" / "Dockerfile").read_text(encoding="utf-8"):
        ok = fail("Dockerfile frontend no usa instalación reproducible") and ok

    required_docs = ["README.md", "RELEASE_CHECKLIST.md", "PILOT_PROTOCOL.md", "ROLLBACK.md", "SECURITY_TRIAGE.md"]
    for name in required_docs:
        if not (ROOT / "docs" / "PR40" / name).is_file():
            ok = fail(f"falta docs/PR40/{name}") and ok

    if not ok:
        return 2
    print("PASS: candidato PR40 congelado, apagado y trazable")
    return 0


if __name__ == "__main__":
    sys.exit(main())
