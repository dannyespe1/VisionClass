from rest_framework import permissions


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False) or getattr(user, "role", "") == "admin")


class D2RLegacyAccessPermission(permissions.BasePermission):
    """Keep historical D2R reads available while writes are feature-gated."""

    message = "D2R está deshabilitado durante la transición."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        from django.conf import settings

        return bool(getattr(settings, "D2R_ENABLED", False))
