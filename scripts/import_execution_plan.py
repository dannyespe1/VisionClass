"""Importa el plan PR01-PR41 desde la extracción textual del DOCX fuente.

El script usa solo la biblioteca estándar. Conserva el texto normativo de cada
PR y produce dos artefactos revisables: JSON estructurado y catálogo Markdown.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_IDS = [f"PR{number:02d}" for number in range(1, 42)]
EXECUTION_ORDER = (
    "G0 PR01 PR03 PR07 PR02 PR04 PR05 PR06 G1 PR08 PR09 PR10 PR29 PR30 PR31 G2 "
    "PR11 PR12 PR13 PR33 PR14 PR15 PR16 PR17 PR18 G3 PR19 PR20 PR21 PR22 PR23 PR24 G4 "
    "PR25 PR26 PR27 PR28 PR32 PR34 G5 PR35 PR36 PR37 PR38 PR39 G6 PR40 PR41"
).split()
SECTION_LABELS = (
    "Objetivo",
    "Prerrequisitos",
    "Alcance incluido",
    "Criterios de aceptación",
    "Validación obligatoria",
    "Restricciones",
    "Riesgo que debes controlar",
    "Rollback",
    "Forma de entrega",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def docx_pr_headings(path: Path) -> list[str]:
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with zipfile.ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    headings: list[str] = []
    for paragraph in root.findall(".//w:p", namespace):
        style = paragraph.find("./w:pPr/w:pStyle", namespace)
        style_name = style.get(f"{{{namespace['w']}}}val") if style is not None else ""
        value = "".join(node.text or "" for node in paragraph.findall(".//w:t", namespace)).strip()
        if style_name in {"Heading1", "1"} and re.match(r"^PR\d{2} ", value):
            headings.append(value)
    return headings


def normal_text(line: str) -> str | None:
    match = re.match(r"^\[P style=Normal\] ?(.*)$", line)
    return match.group(1).strip() if match else None


def section_values(lines: list[str], label: str) -> list[str]:
    marker = f"[P style=Normal] {label}"
    try:
        start = lines.index(marker) + 1
    except ValueError as exc:
        raise ValueError(f"Falta la sección {label!r}") from exc
    values: list[str] = []
    for line in lines[start:]:
        value = normal_text(line)
        if value in SECTION_LABELS:
            break
        if value:
            values.append(value.removeprefix("• ").strip())
    return values


def dependency_ids(raw: str) -> list[str]:
    ids: list[str] = []
    for start, end in re.findall(r"PR(\d{2})\s+a\s+PR(\d{2})", raw):
        ids.extend(f"PR{number:02d}" for number in range(int(start), int(end) + 1))
    ids.extend(re.findall(r"\bPR\d{2}\b|\bP0\.\d\b", raw))
    ids.extend(f"G{number}" for number in re.findall(r"Puerta G(\d)", raw))
    return list(dict.fromkeys(ids))


def table_value(block: str, key: str) -> str:
    for line in block.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        for index in range(0, len(cells) - 1, 2):
            if cells[index] == key:
                return cells[index + 1]
    raise ValueError(f"Falta el campo de tabla {key!r}")


def parse_prs(text: str) -> list[dict[str, object]]:
    headings = list(re.finditer(r"^\[P style=Heading 1\] (PR\d{2}) (.+)$", text, re.MULTILINE))
    found_ids = [match.group(1) for match in headings]
    if sorted(found_ids) != EXPECTED_IDS or len(found_ids) != 41:
        raise ValueError(f"Se esperaban PR01-PR41 una vez; encontrados={found_ids}")

    prs: list[dict[str, object]] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else text.find(
            "[P style=Heading 1] Cierre de cada ola", heading.end()
        )
        if end < 0:
            end = len(text)
        block = text[heading.start() : end]
        lines = block.splitlines()
        wave_match = re.search(r"\[P style=Normal\] Ola recomendada\. (.+)", block)
        if not wave_match:
            raise ValueError(f"{heading.group(1)} no declara ola")
        acceptance = section_values(lines, "Criterios de aceptación")
        risk = section_values(lines, "Riesgo que debes controlar")
        rollback = section_values(lines, "Rollback")
        dependency_text = table_value(block, "Dependencias")
        prs.append(
            {
                "id": heading.group(1),
                "title": heading.group(2).strip(),
                "wave": wave_match.group(1).strip(),
                "owner_suggested": table_value(block, "Responsable"),
                "estimate": table_value(block, "Estimación"),
                "components": table_value(block, "Componentes"),
                "risk_level": table_value(block, "Riesgo"),
                "control": table_value(block, "Control"),
                "dependency_text": dependency_text,
                "repository_dependencies": dependency_ids(dependency_text),
                "objective": " ".join(section_values(lines, "Objetivo")),
                "changes": section_values(lines, "Alcance incluido"),
                "tests": section_values(lines, "Validación obligatoria"),
                "definition_of_done": acceptance,
                "risk": " ".join(risk),
                "rollback": " ".join(rollback),
            }
        )
    ranks = {f"P0.{number}": -1 for number in range(1, 6)}
    ranks.update({item: index for index, item in enumerate(EXECUTION_ORDER)})
    for pr in prs:
        for field in ("title", "wave", "owner_suggested", "objective", "risk", "rollback"):
            if not pr[field]:
                raise ValueError(f"{pr['id']} no define {field}")
        for field in ("changes", "tests", "definition_of_done"):
            if not pr[field]:
                raise ValueError(f"{pr['id']} no define {field}")
        for dependency in pr["repository_dependencies"]:
            if dependency not in ranks or ranks[dependency] >= ranks[pr["id"]]:
                raise ValueError(f"Dependencia fuera del orden aprobado: {dependency} -> {pr['id']}")
    return prs


def render_markdown(payload: dict[str, object]) -> str:
    source = payload["source"]
    lines = [
        "# Catálogo detallado PR01–PR41",
        "",
        "**Estado:** alcance importado; no constituye aprobación ni autoriza implementación.",
        "",
        "## Procedencia",
        "",
        f"- Documento: `{source['document']['name']}` (`sha256:{source['document']['sha256']}`).",
        f"- Extracción: `{source['extraction']['name']}` (`sha256:{source['extraction']['sha256']}`).",
        f"- Fecha de importación: {source['imported_at']}.",
        f"- Contraste de encabezados: {source['heading_cross_check']['document_count']} en DOCX, "
        f"{source['heading_cross_check']['extraction_count']} en extracción, coincidencia exacta.",
        "- Representación normativa estructurada: `PLAN_PR_DETALLADO.json`.",
        "",
        "Los prerrequisitos se conservan literalmente en `dependency_text`. "
        "`repository_dependencies` solo normaliza identificadores P0, G y PR; las aprobaciones y evidencias "
        "descritas en texto siguen siendo obligatorias.",
        "",
    ]
    for pr in payload["prs"]:
        lines.extend(
            [
                f"## {pr['id']} — {pr['title']}",
                "",
                f"- **Ola:** {pr['wave']}",
                f"- **Responsable sugerido:** {pr['owner_suggested']}",
                f"- **Estimación fuente:** {pr['estimate']}",
                f"- **Componentes:** {pr['components']}",
                f"- **Dependencias:** {pr['dependency_text']}",
                f"- **Control:** {pr['control']}",
                f"- **Objetivo:** {pr['objective']}",
                "",
                "**Cambios esperados**",
                "",
                *[f"- {item}" for item in pr["changes"]],
                "",
                "**Pruebas mínimas**",
                "",
                *[f"- {item}" for item in pr["tests"]],
                "",
                "**Definición de terminado**",
                "",
                *[f"- {item}" for item in pr["definition_of_done"]],
                "",
                f"**Riesgo:** {pr['risk_level']}. {pr['risk']}",
                "",
                f"**Rollback:** {pr['rollback']}",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def update_plan(path: Path, prs: list[dict[str, object]]) -> None:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    fields = list(rows[0])
    details = {item["id"]: item for item in prs}
    for row in rows:
        if row["id"] not in details:
            continue
        detail = details[row["id"]]
        row["title"] = str(detail["title"])
        row["detailed_scope"] = "true"
        row["classification_basis"] = "plan_fuente_2026-09-05"
        row["owner_suggested"] = str(detail["owner_suggested"])
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    path.write_text(output.getvalue(), encoding="utf-8")


def render_graph(payload: dict[str, object]) -> str:
    sequence = (
        "G0 → PR01 → PR03 → PR07 → PR02 → PR04 → PR05 → PR06 → G1 → PR08 → PR09 → PR10 → "
        "PR29 → PR30 → PR31 → G2 → PR11 → PR12 → PR13 → PR33 → PR14 → PR15 → PR16 → PR17 → "
        "PR18 → G3 → PR19 → PR20 → PR21 → PR22 → PR23 → PR24 → G4 → PR25 → PR26 → PR27 → "
        "PR28 → PR32 → PR34 → G5 → PR35 → PR36 → PR37 → PR38 → PR39 → G6 → PR40 → PR41"
    )
    lines = [
        "# Grafo de dependencias de VisionClass",
        "",
        "**Estado:** alcance importado y verificable; no constituye aprobación de gates.",
        "",
        "La secuencia aprobada en `AGENTS.md` controla el orden de ejecución:",
        "",
        f"`{sequence}`",
        "",
        "Las aristas siguientes reflejan únicamente identificadores explícitos en el plan fuente. "
        "Las condiciones metodológicas, éticas y operativas conservadas en la tabla también son prerrequisitos.",
        "",
        "```mermaid",
        "flowchart LR",
    ]
    for pr in payload["prs"]:
        for dependency in pr["repository_dependencies"]:
            source = dependency.replace(".", "_")
            lines.append(f"  {source}[{dependency}] --> {pr['id']}[{pr['id']}]")
    lines.extend(
        [
            "```",
            "",
            "## Dependencias literales de la fuente",
            "",
            "| PR | Ola | Prerrequisito fuente |",
            "| --- | --- | --- |",
        ]
    )
    for pr in payload["prs"]:
        lines.append(f"| {pr['id']} | {pr['wave']} | {pr['dependency_text']} |")
    lines.extend(
        [
            "",
            "## Regla de ejecución",
            "",
            "Una arista expresa necesidad semántica; la posición en la secuencia expresa autorización para iniciar. "
            "Ambas condiciones deben cumplirse. Las dependencias en lenguaje natural requieren evidencia enlazada en el issue. "
            "No se paralelizan grupos `serializar` de `COLISIONES_WORKTREES.csv`.",
            "",
            "`PLAN_TRABAJO.csv` conserva la secuencia operativa y `PLAN_PR_DETALLADO.json` conserva el alcance normativo completo.",
            "",
        ]
    )
    return "\n".join(lines)


def render_epics(payload: dict[str, object]) -> str:
    by_id = {item["id"]: item for item in payload["prs"]}
    groups = [
        ("EPIC-G1", "G0", ["PR01", "PR03", "PR07", "PR02", "PR04", "PR05", "PR06"], "G1"),
        ("EPIC-G2", "G1", ["PR08", "PR09", "PR10", "PR29", "PR30", "PR31"], "G2"),
        ("EPIC-G3", "G2", ["PR11", "PR12", "PR13", "PR33", "PR14", "PR15", "PR16", "PR17", "PR18"], "G3"),
        ("EPIC-G4", "G3", ["PR19", "PR20", "PR21", "PR22", "PR23", "PR24"], "G4"),
        ("EPIC-G5", "G4", ["PR25", "PR26", "PR27", "PR28", "PR32", "PR34"], "G5"),
        ("EPIC-G6", "G5", ["PR35", "PR36", "PR37", "PR38", "PR39"], "G6"),
        ("EPIC-CLOSE", "G6", ["PR40", "PR41"], None),
    ]
    lines = [
        "# Épicas preparadas para GitHub Issues",
        "",
        "Estos cuerpos separan código, operación y aprobación. Las casillas no representan aprobación ni ejecución.",
        "",
        "Los PR de código posteriores deben ser compatibles con [ADR-0001](../PR01/ADR-0001-ARQUITECTURA-OBJETIVO.md). "
        "Mientras G0 siga bloqueada, la referencia describe una arquitectura candidata y no autoriza implementación o exposición.",
        "",
        "## EPIC-P0 — Preparación y G0",
        "",
        "**Resultado:** reunir evidencia P0.1–P0.5 y decidir G0 antes de cualquier PR de producto.  ",
        "**Propietario sugerido:** sponsor del estudio.  ",
        "**Estado:** bloqueado.",
        "",
        "- [ ] `operations` P0.1 — Auditoría y línea base",
        "- [ ] `operations` P0.2 — Datos, amenazas y privacidad",
        "- [ ] `operations` P0.3 — Constructo, protocolo y evidencia",
        "- [ ] `operations` P0.4 — Umbrales y suspensión",
        "- [ ] `operations` P0.5 — Preparación del repositorio",
        "- [ ] `approval` G0 — acta independiente basada en P0.1–P0.5",
        "",
    ]
    for epic, gate_dependency, prs, closing_gate in groups:
        label = f"{prs[0]} a {prs[-1]}" if len(prs) > 1 else prs[0]
        lines.extend(
            [
                f"## {epic} — {label}" + (f" y aprobación {closing_gate}" if closing_gate else ""),
                "",
                f"**Dependencia de inicio:** {gate_dependency}.  ",
                "**Estado:** bloqueado hasta aprobar el gate y los prerrequisitos de cada PR.",
                "",
            ]
        )
        for pr_id in prs:
            pr = by_id[pr_id]
            lines.append(f"- [ ] `code` {pr_id} — {pr['title']} _(prerrequisito: {pr['dependency_text']})_")
        if closing_gate:
            lines.append(f"- [ ] `approval` {closing_gate} — decisión sobre evidencia del tramo")
        lines.append("")
    lines.extend(
        [
            "## Regla para publicación",
            "",
            "Cada issue hijo debe copiar su objetivo, cambios, pruebas, definición de terminado, riesgo y rollback desde "
            "`PLAN_PR_DETALLADO.json`, enlazar esta épica y declarar los archivos previstos y grupos de colisión. "
            "Una persona responsable debe ratificar el contenido importado antes de marcarlo listo. Publicar una épica "
            "no desbloquea ninguna unidad ni equivale a aprobar un gate.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("extraction", type=Path)
    parser.add_argument("document", type=Path)
    parser.add_argument("--imported-at", default="2026-09-13")
    parser.add_argument("--json-output", type=Path, default=ROOT / "docs/P0.5/PLAN_PR_DETALLADO.json")
    parser.add_argument("--markdown-output", type=Path, default=ROOT / "docs/P0.5/CATALOGO_PR.md")
    parser.add_argument("--plan-output", type=Path, default=ROOT / "docs/P0.5/PLAN_TRABAJO.csv")
    parser.add_argument("--graph-output", type=Path, default=ROOT / "docs/P0.5/GRAFO_DEPENDENCIAS.md")
    parser.add_argument("--epics-output", type=Path, default=ROOT / "docs/P0.5/EPICAS.md")
    args = parser.parse_args()

    prs = parse_prs(args.extraction.read_text(encoding="utf-8-sig"))
    extraction_headings = [f"{item['id']} {item['title']}" for item in prs]
    document_headings = docx_pr_headings(args.document)
    if document_headings != extraction_headings:
        raise ValueError("Los encabezados PR del DOCX y de la extracción no coinciden exactamente")
    payload = {
        "schema_version": 1,
        "status": "IMPORTED_NOT_APPROVED",
        "source": {
            "document": {"name": args.document.name, "sha256": sha256(args.document)},
            "extraction": {"name": args.extraction.name, "sha256": sha256(args.extraction)},
            "imported_at": args.imported_at,
            "heading_cross_check": {
                "document_count": len(document_headings),
                "extraction_count": len(extraction_headings),
                "exact_match": True,
            },
        },
        "prs": prs,
    }
    args.json_output.parent.mkdir(parents=True, exist_ok=True)
    args.json_output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.markdown_output.write_text(render_markdown(payload), encoding="utf-8")
    args.graph_output.write_text(render_graph(payload), encoding="utf-8")
    args.epics_output.write_text(render_epics(payload), encoding="utf-8")
    update_plan(args.plan_output, prs)
    print(
        f"Plan importado: {len(prs)} PR; {args.json_output}; "
        f"{args.markdown_output}; {args.plan_output}"
    )


if __name__ == "__main__":
    main()
