from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_user_profile_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="category",
            field=models.CharField(blank=True, default="General", max_length=120),
        ),
        migrations.CreateModel(
            name="PrivacyPolicySetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("current_value", models.CharField(max_length=255)),
                ("options", models.JSONField(blank=True, default=list)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name", "id"],
            },
        ),
        migrations.CreateModel(
            name="ResearchAccessRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("researcher", models.CharField(max_length=255)),
                ("institution", models.CharField(max_length=255)),
                ("project", models.CharField(max_length=255)),
                ("data_requested", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("pending", "Pendiente"), ("approved", "Aprobado"), ("rejected", "Rechazado")], default="pending", max_length=20)),
                ("ethics_approval", models.BooleanField(default=False)),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-requested_at", "id"],
            },
        ),
    ]
