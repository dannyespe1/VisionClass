from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Comando retirado: la identidad ML ya no usa cuentas de usuario ni JWT administrativos."

    def handle(self, *args, **options):
        raise CommandError(
            "Retirado por PR04. Configure ML_SERVICE_TOKEN mediante el gestor de "
            "secretos y siga docs/PR04/RUNBOOK_ROTACION.md."
        )
