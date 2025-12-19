from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_course_structure"),
    ]

    operations = [
        migrations.AddField(
            model_name="coursematerial",
            name="file_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="coursematerial",
            name="file_content_type",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="coursematerial",
            name="file_size",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="coursematerial",
            name="file_bytes",
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
