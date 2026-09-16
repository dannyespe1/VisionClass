import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0023_pr22_model_rollout")]

    operations = [
        migrations.CreateModel(
            name="DeviceBudgetTelemetry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("profile", models.CharField(max_length=16)),
                ("profile_generation", models.PositiveIntegerField()),
                ("device_class", models.CharField(max_length=16)),
                ("fps_bucket", models.CharField(max_length=16)),
                ("latency_bucket", models.CharField(max_length=16)),
                ("memory_bucket", models.CharField(max_length=16)),
                ("network_bucket", models.CharField(max_length=16)),
                ("cpu_load_bucket", models.CharField(max_length=16)),
                ("energy_bucket", models.CharField(max_length=16)),
                ("sample_count", models.PositiveSmallIntegerField()),
                ("invalid_sample_count", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("course_session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="device_budget_samples", to="api.session")),
            ],
            options={"ordering": ["-created_at", "id"]},
        ),
        migrations.AddIndex(model_name="devicebudgettelemetry", index=models.Index(fields=["course_session", "profile", "created_at"], name="api_deviceb_course__61278d_idx")),
        migrations.AddIndex(model_name="devicebudgettelemetry", index=models.Index(fields=["expires_at"], name="api_deviceb_expires_548521_idx")),
    ]
