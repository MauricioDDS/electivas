from rest_framework.permissions import BasePermission

class IsDocente(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "DOCENTE")

class IsEstudiante(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "ESTUDIANTE")
