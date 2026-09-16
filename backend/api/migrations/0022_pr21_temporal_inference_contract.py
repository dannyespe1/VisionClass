# Generated for PR21 temporal inference contract.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_retentionrun"),
    ]

    operations = [
        migrations.AddField(
            model_name="inferredstate",
            name="inference_id",
            field=models.UUIDField(blank=True, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="inferredstate",
            name="quality",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name="inferredstate",
            name="state",
            field=models.CharField(
                choices=[
                    ("no_observable", "No observable"),
                    ("unknown", "Unknown"),
                    ("off_task_evidence", "Off-task observable evidence"),
                    ("task_oriented_evidence", "Task-oriented observable evidence"),
                    ("attentive", "Attentive"),
                    ("distracted", "Distracted"),
                ],
                max_length=32,
            ),
        ),
        migrations.AddConstraint(
            model_name="inferredstate",
            constraint=models.UniqueConstraint(
                condition=models.Q(("inference_id__isnull", False)),
                fields=("window", "model_reference", "inference_version"),
                name="uniq_effective_inference_per_window_model",
            ),
        ),
    ]
