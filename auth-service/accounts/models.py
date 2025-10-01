from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Roles(models.TextChoices):
        DOCENTE = "DOCENTE", "Docente"
        ESTUDIANTE = "ESTUDIANTE", "Estudiante"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=12, choices=Roles.choices)

    REQUIRED_FIELDS = ["email", "role"]  # además de username & password

    def __str__(self):
        return f"{self.username} ({self.role})"
