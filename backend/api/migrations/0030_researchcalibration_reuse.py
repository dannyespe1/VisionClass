from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0029_researchcalibration_observer_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="researchcalibration",
            name="reuse_token_hash",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="researchcalibration",
            name="valid_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="researchcalibration",
            index=models.Index(
                fields=["participant", "reuse_token_hash", "valid_until"],
                name="api_rescal_reuse_5019a4_idx",
            ),
        ),
    ]
