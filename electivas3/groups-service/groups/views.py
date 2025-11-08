import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Group
from .serializers import GroupSerializer
from .tasks import notify_group_published

def _course_info(course_id: int):
    base = settings.COURSES_BASE_URL.rstrip("/")
    r = requests.get(f"{base}/course/{course_id}", timeout=10)
    r.raise_for_status()
    return r.json()

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().order_by("-created_at")
    serializer_class = GroupSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # completar nombre/código desde course-ms si no vienen
        if not data.get("course_name") or not data.get("course_code"):
            info = _course_info(int(data["course_id"]))
            data["course_name"] = info.get("nombre")
            data["course_code"] = info.get("codigo")
        ser = self.get_serializer(data=data)
        ser.is_valid(raise_exception=True)
        group = ser.save()
        # publicar de una si viene publish=true
        if str(request.query_params.get("publish","")).lower() in ("1","true","yes"):
            group.status = Group.Status.PUBLISHED
            group.save(update_fields=["status"])
            notify_group_published.delay({"group": GroupSerializer(group).data})
        headers = self.get_success_headers(ser.data)
        return Response(ser.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        group = self.get_object()
        if group.status == Group.Status.PUBLISHED:
            return Response({"detail": "Ya publicado"}, status=200)
        group.status = Group.Status.PUBLISHED
        group.save(update_fields=["status"])
        notify_group_published.delay({"group": GroupSerializer(group).data})
        return Response({"detail": "Publicado y notificado"}, status=200)

    @action(detail=True, methods=["get"])
    def seats(self, request, pk=None):
        g = self.get_object()
        return Response({
            "capacity": g.capacity,
            "seats_taken": g.seats_taken,
            "available": max(0, g.capacity - g.seats_taken)
        })
