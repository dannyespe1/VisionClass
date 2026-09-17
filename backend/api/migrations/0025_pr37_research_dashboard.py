import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0024_devicebudgettelemetry"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("student", "Estudiante"),
                    ("teacher", "Profesor"),
                    ("admin", "Administrador"),
                    ("researcher", "Investigador"),
                ],
                default="student",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="researchaccessrequest",
            name="principal",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="research_access_grants",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="researchaccessrequest",
            name="purpose",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="researchaccessrequest",
            name="expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="researchaccessrequest",
            name="cohort_scope",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="researchaccessrequest",
            name="model_scope",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="researchaccessrequest",
            name="profile_scope",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name="ResearchExportLease",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("export_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("token_digest", models.CharField(max_length=64, unique=True)),
                ("purpose", models.TextField()),
                ("filters", models.JSONField(default=dict)),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("expires_at", models.DateTimeField()),
                ("downloaded_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "grant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="export_leases",
                        to="api.researchaccessrequest",
                    ),
                ),
                (
                    "requested_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="research_export_leases",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.AddIndex(
            model_name="researchexportlease",
            index=models.Index(fields=["requested_by", "expires_at"], name="api_resexp_user_exp_idx"),
        ),
        migrations.AddIndex(
            model_name="researchexportlease",
            index=models.Index(fields=["expires_at"], name="api_resexp_exp_idx"),
        ),
    ]
