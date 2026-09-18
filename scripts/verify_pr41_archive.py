"""Static guard that keeps the retired component out of runtime surfaces."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOKEN = "d" + "2r"
RUNTIME_ROOTS = (ROOT / "backend" / "api", ROOT / "backend" / "core", ROOT / "frontend" / "app", ROOT / "ml")
ALLOWED = {
    ROOT / "backend" / "api" / "legacy_archive.py",
    ROOT / "backend" / "api" / "tests_pr41_archive.py",
}

violations = []
for runtime_root in RUNTIME_ROOTS:
    for path in runtime_root.rglob("*"):
        if not path.is_file() or path.suffix not in {".py", ".ts", ".tsx", ".mjs", ".mts"}:
            continue
        if "migrations" in path.parts or path in ALLOWED:
            continue
        if TOKEN in path.name.lower() or TOKEN in path.read_text(encoding="utf-8").lower():
            violations.append(str(path.relative_to(ROOT)))

if violations:
    raise SystemExit(f"Referencias ejecutables heredadas: {violations}")

for required in (
    ROOT / "docs" / "PR41" / "INVENTARIO_Y_DECISION.md",
    ROOT / "docs" / "PR41" / "ROLLBACK.md",
    ROOT / "backend" / "api" / "migrations" / "0026_pr41_archive_legacy_assessment.py",
):
    if not required.exists():
        raise SystemExit(f"Falta evidencia PR41: {required.relative_to(ROOT)}")

print("PR41: archivo definitivo sin referencias ejecutables activas")
