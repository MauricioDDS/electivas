from rest_framework import serializers
from .models import Group, GroupSchedule

class GroupScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupSchedule
        fields = ("id", "day", "start_time", "end_time", "room")

class GroupSerializer(serializers.ModelSerializer):
    schedule = GroupScheduleSerializer(many=True, required=False)

    class Meta:
        model = Group
        fields = (
            "id", "course_id", "term", "group_code", "teacher_id",
            "capacity", "status", "created_at", "updated_at", "schedule"
        )
        read_only_fields = ("id", "created_at", "updated_at")
