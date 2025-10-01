from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer
from .tokens import CustomTokenObtainPairSerializer
from .permissions import IsDocente, IsEstudiante

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class DocenteOnlyView(APIView):
    permission_classes = [IsDocente]
    def get(self, request):
        return Response({"ok": True, "msg": "Solo docentes"})

class EstudianteOnlyView(APIView):
    permission_classes = [IsEstudiante]
    def get(self, request):
        return Response({"ok": True, "msg": "Solo estudiantes"})

class LogoutView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "refresh token required"}, status=400)
        try:
            RefreshToken(refresh).blacklist()
        except Exception:
            return Response({"detail": "invalid token"}, status=400)
        return Response(status=205)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CustomTokenRefreshView(TokenRefreshView):
    pass
