from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = "Crea un superusuario por defecto si no existe (usa variables de entorno opcionales)."

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get("ADMIN_USERNAME", "admin")
        email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
        password = os.environ.get("ADMIN_PASSWORD", "Vision123!")

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"Ya existe el usuario admin '{username}'"))
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(
            self.style.SUCCESS(
                f"Superusuario creado: username='{username}' email='{email}' password='{password}'"
            )
        )
