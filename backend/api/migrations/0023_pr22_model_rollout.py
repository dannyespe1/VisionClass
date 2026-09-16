# Generated for PR22 model rollout controls.

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("api", "0022_pr21_temporal_inference_contract")]

    operations = [
        migrations.CreateModel(
            name="ModelAlias",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("environment", models.CharField(max_length=32)),
                ("name", models.CharField(max_length=64)),
                ("mode", models.CharField(choices=[("stable", "Stable"), ("shadow", "Shadow"), ("canary", "Canary"), ("paused", "Paused")], default="stable", max_length=16)),
                ("canary_percentage", models.PositiveSmallIntegerField(default=0)),
                ("thresholds", models.JSONField(default=dict)),
                ("revision", models.PositiveIntegerField(default=1)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("active_model", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="active_aliases", to="api.modelartifact")),
                ("candidate_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="candidate_aliases", to="api.modelartifact")),
                ("previous_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="previous_aliases", to="api.modelartifact")),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(fields=("environment", "name"), name="uniq_model_alias_environment_name"),
                    models.CheckConstraint(condition=models.Q(("canary_percentage__gte", 0), ("canary_percentage__lte", 100)), name="model_alias_canary_percentage_range"),
                ]
            },
        ),
        migrations.CreateModel(
            name="ModelRolloutEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("action", models.CharField(max_length=32)),
                ("reason_code", models.CharField(max_length=64)),
                ("metrics", models.JSONField(blank=True, default=dict)),
                ("configuration", models.JSONField(default=dict)),
                ("recorded_by", models.CharField(max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("alias", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="events", to="api.modelalias")),
                ("from_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="rollout_events_from", to="api.modelartifact")),
                ("to_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="rollout_events_to", to="api.modelartifact")),
            ],
            options={"indexes": [models.Index(fields=["alias", "created_at"], name="api_modelro_alias_i_68bc18_idx")]},
        ),
    ]
