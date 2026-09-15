import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)


expected = {
    "PR01": "14b7a8b0ae6233e6c555eca68704db2f1682399d",
    "PR03": "89ece8874ff446619f83ce0dd6b176b54ad4897c",
    "PR07": "96eb7dd674c76de0a7d036c5b3ae221a641e2f24",
}
for name, commit in expected.items():
    if git("merge-base", "--is-ancestor", commit, "HEAD").returncode:
        raise SystemExit(f"FAIL: {name} no es ancestro de HEAD")

parked = "8ae22574f6c346edb268033a2b42a49521476c6b"
if git("merge-base", "--is-ancestor", parked, "HEAD").returncode == 0:
    raise SystemExit("FAIL: PR02 aparcado fue integrado")

verification = json.loads((ROOT / "docs/WAVE1/VERIFICACION.json").read_text(encoding="utf-8"))
if verification["g0"] != "BLOCKED" or verification["authorized_participants"] != 0:
    raise SystemExit("FAIL: el registro alteró G0 o participantes autorizados")
if verification["wave1_closed"] is not False:
    raise SystemExit("FAIL: Ola 1 no puede figurar cerrada")
if not (ROOT / "backend/api/migrations/0014_merge_pr03_pr07.py").exists():
    raise SystemExit("FAIL: falta unión del grafo de migraciones")
print("PASS Ola 1: PR01+PR03+PR07; PR02 aparcado; G0 bloqueada; 0 participantes")
