from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_coursematerial_file_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='D2RSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scheduled_for', models.DateTimeField()),
                ('status', models.CharField(choices=[('pending', 'Pendiente'), ('completed', 'Completado'), ('cancelled', 'Cancelado')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='d2r_schedules', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['scheduled_for', 'id'],
            },
        ),
    ]
