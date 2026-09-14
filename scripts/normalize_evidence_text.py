"""Normaliza finales de línea y espacios finales en evidencia textual versionada."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".md", ".txt", ".csv", ".json", ".py", ".yml", ".yaml"}


def normalize(path: Path) -> bool:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return False
    lines = text.splitlines()
    odd_lines = lines[1::2]
    if odd_lines and all(not line for line in odd_lines):
        lines = lines[::2]
    stripped = [line.rstrip() for line in lines]
    normalized = "" if not any(stripped) else "\n".join(stripped).rstrip("\n") + "\n"
    if path.read_bytes() == normalized.encode("utf-8"):
        return False
    path.write_text(normalized, encoding="utf-8", newline="\n")
    return True


if __name__ == "__main__":
    roots = [ROOT / "AGENTS.md", ROOT / ".github", ROOT / "docs", ROOT / "scripts"]
    paths: list[Path] = []
    for root in roots:
        if root.is_file():
            paths.append(root)
        elif root.is_dir():
            paths.extend(path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES)
    changed = [path for path in paths if normalize(path)]
    print(f"Texto normalizado: {len(changed)} archivos")
