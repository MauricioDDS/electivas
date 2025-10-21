from django.urls import path
from .views import (
    RegisterView, MeView, LogoutView,
    EstudianteOnlyView, UserListView, UserDetailView, UpdateUserRoleView, 
    CustomTokenObtainPairView, CustomTokenRefreshView
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    
    #ENDPOINTS DE ADMIN
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/role/", UpdateUserRoleView.as_view(), name="user-update-role"),
    path("only-estudiante/", EstudianteOnlyView.as_view(), name="only-estudiante"),
]
