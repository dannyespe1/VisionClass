from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_d2rschedule"),
    ]

    operations = [
        migrations.CreateModel(
            name="StudentReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="api.user")),
            ],
            options={
                "ordering": ["-created_at", "id"],
            },
        ),
    ]
