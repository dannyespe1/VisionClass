from django.db import migrations, models


TABLE_RENAMES = (
    ("api_d2rattentionevent", "archive_api_d2rattentionevent_pr41"),
    ("api_d2rresult", "archive_api_d2rresult_pr41"),
    ("api_d2rschedule", "archive_api_d2rschedule_pr41"),
    ("api_d2rsession", "archive_api_d2rsession_pr41"),
)


def _rename_tables(schema_editor, pairs):
    existing = set(schema_editor.connection.introspection.table_names())
    quote = schema_editor.quote_name
    for source, target in pairs:
        if source not in existing or target in existing:
            continue
        schema_editor.execute(f"ALTER TABLE {quote(source)} RENAME TO {quote(target)}")
        existing.remove(source)
        existing.add(target)


def archive_tables(apps, schema_editor):
    _rename_tables(schema_editor, TABLE_RENAMES)


def restore_tables(apps, schema_editor):
    _rename_tables(schema_editor, tuple((target, source) for source, target in reversed(TABLE_RENAMES)))


def retire_baseline_course(apps, schema_editor):
    Course = apps.get_model("api", "Course")
    Course.objects.filter(title__iexact="baseline d2r").update(
        title="[ARCHIVED PR41] Baseline D2R",
        is_active=False,
    )


def restore_baseline_course(apps, schema_editor):
    Course = apps.get_model("api", "Course")
    Course.objects.filter(title="[ARCHIVED PR41] Baseline D2R").update(
        title="Baseline D2R",
        is_active=True,
    )


class Migration(migrations.Migration):
    dependencies = [("api", "0025_pr37_research_dashboard")]

    operations = [
        migrations.RunPython(retire_baseline_course, restore_baseline_course),
        migrations.RemoveConstraint(
            model_name="temporalsession",
            name="temporal_session_exactly_one_source",
        ),
        migrations.RenameField(
            model_name="temporalsession",
            old_name="d2r_session",
            new_name="legacy_assessment_source",
        ),
        migrations.AlterField(
            model_name="temporalsession",
            name="legacy_assessment_source",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.RenameField(
            model_name="temporalsession",
            old_name="legacy_assessment_source",
            new_name="legacy_assessment_source_id",
        ),
        migrations.AddConstraint(
            model_name="temporalsession",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(course_session__isnull=False, legacy_assessment_source_id__isnull=True)
                    | models.Q(course_session__isnull=True, legacy_assessment_source_id__isnull=False)
                ),
                name="temporal_session_exactly_one_source",
            ),
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[migrations.RunPython(archive_tables, restore_tables)],
            state_operations=[
                migrations.DeleteModel(name="D2RAttentionEvent"),
                migrations.DeleteModel(name="D2RResult"),
                migrations.DeleteModel(name="D2RSchedule"),
                migrations.DeleteModel(name="D2RSession"),
            ],
        ),
    ]
