"""Sondas de auditoría P0.1; solo SQLite en memoria y transporte ML simulado.

Ejecutar: <venv-backend>/python docs/P0.1/probe_baseline.py <copia-repo>
No importa ml_service (evita cámara, entrenamiento e inicialización de modelos).
"""
import ast
import asyncio
import os
from pathlib import Path
import sys
from types import SimpleNamespace

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / "backend"))
os.environ["DJANGO_SETTINGS_MODULE"] = "core.settings"
import django
from django.conf import settings

settings.DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
settings.ALLOWED_HOSTS = ["testserver"]
settings.SECURE_SSL_REDIRECT = False
settings.MAILGUN_API_KEY = ""
django.setup()
from django.core.management import call_command
from rest_framework.test import APIClient
from api.models import User, Course

call_command("migrate", verbosity=0, interactive=False)
print("MIGRATIONS_SQLITE_EMPTY=PASS")
call_command("makemigrations", check=True, dry_run=True, verbosity=1)
client = APIClient()
response = client.post("/api/users/", {
    "username": "audit-admin", "email": "audit-admin@example.invalid",
    "password": "audit-only-strong-password", "role": "admin",
}, format="json")
print("ANONYMOUS_REGISTER_ADMIN", response.status_code, response.data.get("role"))
student = User.objects.create_user(username="audit-student", role="student")
client.force_authenticate(user=student)
response = client.patch("/api/me/", {"role": "admin"}, format="json")
student.refresh_from_db()
print("SELF_ROLE_CHANGE", response.status_code, student.role)
student.role = "student"
student.save(update_fields=["role"])
owner = User.objects.create_user(username="audit-teacher", role="teacher")
course = Course.objects.create(title="audit course", owner=owner)
response = client.patch(f"/api/courses/{course.pk}/", {"title": "changed by student"}, format="json")
course.refresh_from_db()
print("STUDENT_PATCH_OTHER_COURSE", response.status_code, course.title)

# Ejecuta exactamente la función del repositorio con un transporte simulado.
tree = ast.parse((root / "ml/ml_service.py").read_text(encoding="utf-8-sig"))
function = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "post_event_to_backend")
captured = {}
class FakeClient:
    def __init__(self, **kwargs):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, *args):
        pass
    async def post(self, url, **kwargs):
        captured.update(kwargs)
        return SimpleNamespace(status_code=201)
class Payload:
    d2r_session_id = 1
    session_id = None
    def model_dump(self):
        return {"d2r_session_id": 1, "user_id": 1}
namespace = {"BACKEND_TOKEN": "synthetic-audit-token", "BACKEND_URL": "https://example.invalid",
             "httpx": SimpleNamespace(AsyncClient=FakeClient), "AttentionEventPayload": Payload,
             "HTTPException": RuntimeError}
exec(compile(ast.Module(body=[function], type_ignores=[]), "ml_service.py:extracted", "exec"), namespace)
asyncio.run(namespace["post_event_to_backend"](Payload()))
print("ML_POST_INCLUDES_AUTHORIZATION", "Authorization" in captured.get("headers", {}))
from pydantic import TypeAdapter, ValidationError
try:
    TypeAdapter(int).validate_python("false")
    print("D2R_SPINNING_STRING_FALSE=ACCEPTED")
except ValidationError:
    print("D2R_SPINNING_STRING_FALSE=REJECTED_BY_INT_VALIDATOR")
