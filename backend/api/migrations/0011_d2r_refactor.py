from django.db import migrations, models
import django.db.models.deletion


def migrate_d2r_data(apps, schema_editor):
    D2RResult = apps.get_model("api", "D2RResult")
    D2RSession = apps.get_model("api", "D2RSession")
    D2RAttentionEvent = apps.get_model("api", "D2RAttentionEvent")
    Session = apps.get_model("api", "Session")
    AttentionEvent = apps.get_model("api", "AttentionEvent")

    session_map = {}
    results = D2RResult.objects.select_related("session", "user")
    for res in results:
        session = res.session
        if not session:
            continue
        d2r_session = session_map.get(session.id)
        if not d2r_session:
            d2r_session = D2RSession.objects.create(
                user=session.student,
                started_at=session.started_at,
                ended_at=session.ended_at,
                attention_score=session.attention_score,
                mean_attention=session.mean_attention,
                low_attention_ratio=session.low_attention_ratio,
                frame_count=session.frame_count,
                last_score=session.last_score,
                raw_metrics=session.raw_metrics or {},
            )
            session_map[session.id] = d2r_session
            events = AttentionEvent.objects.filter(session_id=session.id).order_by("timestamp")
            for evt in events:
                D2RAttentionEvent.objects.create(
                    d2r_session=d2r_session,
                    user=evt.user,
                    timestamp=evt.timestamp,
                    value=evt.value,
                    label=evt.label,
                    data=evt.data or {},
                )
        res.d2r_session_id = d2r_session.id
        res.save(update_fields=["d2r_session"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_course_category_and_admin_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="D2RSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("attention_score", models.FloatField(blank=True, null=True)),
                ("mean_attention", models.FloatField(default=0)),
                ("low_attention_ratio", models.FloatField(default=0)),
                ("frame_count", models.PositiveIntegerField(default=0)),
                ("last_score", models.FloatField(blank=True, null=True)),
                ("raw_metrics", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="d2r_sessions", to="api.user")),
            ],
        ),
        migrations.CreateModel(
            name="D2RAttentionEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("timestamp", models.DateTimeField()),
                ("value", models.FloatField()),
                ("label", models.CharField(blank=True, max_length=100)),
                ("data", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("d2r_session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="api.d2rsession")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="d2r_attention_events", to="api.user")),
            ],
        ),
        migrations.AddField(
            model_name="d2rresult",
            name="d2r_session",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="results", to="api.d2rsession"),
        ),
        migrations.RunPython(migrate_d2r_data, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="d2rresult",
            name="session",
        ),
        migrations.AlterField(
            model_name="d2rresult",
            name="d2r_session",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="results", to="api.d2rsession"),
        ),
        migrations.AddIndex(
            model_name="d2rsession",
            index=models.Index(fields=["user"], name="api_d2rsess_user_id_8c6e88_idx"),
        ),
        migrations.AddIndex(
            model_name="d2rattentionevent",
            index=models.Index(fields=["d2r_session", "timestamp"], name="api_d2ratte_d2r_se_05fe4e_idx"),
        ),
    ]
