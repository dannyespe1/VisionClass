from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_d2rresult_phase_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="enrollment",
            name="enrollment_data",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
