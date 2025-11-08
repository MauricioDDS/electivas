from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        ESTUDIANTE = "ESTUDIANTE", "Estudiante"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=12, choices=Roles.choices)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "role"]  # además de username & password

    def __str__(self):
        return f"{self.email} ({self.role})"
