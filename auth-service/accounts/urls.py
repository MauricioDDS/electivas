from django.urls import path
from .views import (
    RegisterView, MeView, LogoutView,
    DocenteOnlyView, EstudianteOnlyView,
    CustomTokenObtainPairView, CustomTokenRefreshView
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    # ejemplos de endpoints con permisos por rol:
    path("only-docente/", DocenteOnlyView.as_view(), name="only-docente"),
    path("only-estudiante/", EstudianteOnlyView.as_view(), name="only-estudiante"),
]
