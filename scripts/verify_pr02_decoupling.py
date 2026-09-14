"""Comprueba invariantes estáticos del desacoplamiento D2R de PR02."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def require(relative_path: str, tokens: tuple[str, ...]) -> None:
    text = read(relative_path)
    missing = [token for token in tokens if token not in text]
    if missing:
        raise SystemExit(f"{relative_path} no conserva invariantes PR02: {missing}")


def main() -> None:
    require(
        "frontend/app/lib/features.ts",
        ('NEXT_PUBLIC_D2R_ENABLED', '=== "true"'),
    )
    require(
        "frontend/app/login/LoginContent.tsx",
        (
            'if (D2R_ENABLED && profile.role === "student")',
            'postLoginRoute(profile, { d2rEnabled: D2R_ENABLED, hasD2RResult })',
        ),
    )
    require(
        "frontend/app/d2r/page.tsx",
        ('if (!D2R_ENABLED)', 'router.replace("/student")'),
    )
    require(
        "frontend/app/student/page.tsx",
        ('router.push(`/student/course/${courseId}`)',),
    )
    require(
        "backend/core/settings.py",
        ("D2R_ENABLED = os.environ.get('D2R_ENABLED', 'False')",),
    )
    require(
        "backend/api/views.py",
        (
            "permissions.IsAuthenticated, D2RLegacyAccessPermission",
            "if settings.D2R_ENABLED",
            "D2RResult.objects.none()",
            "D2RSchedule.objects.none()",
        ),
    )
    if read("backend/api/views.py").count("D2RLegacyAccessPermission]") != 4:
        raise SystemExit("Los cuatro recursos D2R deben aplicar el permiso de transición")
    require(
        "backend/api/admin.py",
        ("class D2RLegacyAdmin", "settings.D2R_ENABLED"),
    )
    require(
        "docs/PR02/INFORME.md",
        ("G0 continúa `BLOQUEADA`", "PR41", "Rollback temporal"),
    )
    print("PR02: flujo principal desacoplado; legado D2R aislado y reversible")


if __name__ == "__main__":
    main()
