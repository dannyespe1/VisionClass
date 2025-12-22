from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_studentreport"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="profile_image",
            field=models.TextField(blank=True, default=""),
        ),
    ]
