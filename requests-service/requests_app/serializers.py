from rest_framework import serializers
from .models import CupoRequest

class CupoRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CupoRequest
        fields = ("id","student_email","course_id","group_id","group_code","message","status","created_at")
        read_only_fields = ("id","status","created_at")
