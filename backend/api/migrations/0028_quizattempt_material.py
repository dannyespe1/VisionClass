import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0027_observer_annotation_no_observable_reason"),
    ]

    operations = [
        migrations.AddField(
            model_name="quizattempt",
            name="material",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="quiz_attempts",
                to="api.coursematerial",
            ),
        ),
    ]
