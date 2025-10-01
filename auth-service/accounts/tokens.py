from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Claims extra útiles para otros servicios
        token["role"] = user.role
        token["username"] = user.username
        token["name"] = f"{user.first_name} {user.last_name}".strip()
        return token
