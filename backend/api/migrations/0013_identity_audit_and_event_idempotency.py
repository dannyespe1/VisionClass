from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0012_studentnotification_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SecurityAuditEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=80)),
                ('outcome', models.CharField(max_length=20)),
                ('reason_code', models.CharField(max_length=80)),
                ('resource_type', models.CharField(blank=True, max_length=40)),
                ('resource_id', models.CharField(blank=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='security_audit_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at', '-id']},
        ),
        migrations.AddField(
            model_name='attentionevent',
            name='idempotency_key',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='d2rattentionevent',
            name='idempotency_key',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddConstraint(
            model_name='attentionevent',
            constraint=models.UniqueConstraint(fields=('session', 'idempotency_key'), name='uniq_attention_event_idempotency'),
        ),
        migrations.AddConstraint(
            model_name='d2rattentionevent',
            constraint=models.UniqueConstraint(fields=('d2r_session', 'idempotency_key'), name='uniq_d2r_event_idempotency'),
        ),
    ]
