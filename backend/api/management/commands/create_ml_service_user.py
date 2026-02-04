import os
import secrets

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken


class Command(BaseCommand):
    help = "Crea/actualiza un usuario de servicio para ML y devuelve un JWT."

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get("ML_SERVICE_EMAIL", "ml_service@visionclass.local")
        password = os.environ.get("ML_SERVICE_PASSWORD", "") or secrets.token_urlsafe(24)
        role = os.environ.get("ML_SERVICE_ROLE", "admin")

        user, created = User.objects.get_or_create(email=email, defaults={
            "username": email,
            "role": role,
            "is_staff": role == "admin",
            "is_superuser": role == "admin",
        })
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
        else:
            if role and user.role != role:
                user.role = role
            if role == "admin":
                user.is_staff = True
                user.is_superuser = True
            if os.environ.get("ML_SERVICE_PASSWORD"):
                user.set_password(password)
            user.save()

        token = RefreshToken.for_user(user)
        self.stdout.write("ML service user listo.")
        self.stdout.write(f"email={email}")
        self.stdout.write(f"password={password}")
        self.stdout.write(f"access={str(token.access_token)}")
