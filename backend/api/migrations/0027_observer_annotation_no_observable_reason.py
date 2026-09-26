from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0026_pr41_archive_legacy_assessment"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="observerannotation",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(
                        category="no_observable",
                        notes_code__in=(
                            "sin_rostro",
                            "oclusion",
                            "iluminacion",
                            "multiples_personas",
                            "fallo_dispositivo",
                            "material_fuera_de_pantalla",
                            "retiro_consentimiento",
                            "otro_especificado",
                        ),
                    )
                    | ~models.Q(category="no_observable")
                ),
                name="observer_annotation_no_observable_reason",
            ),
        ),
    ]
