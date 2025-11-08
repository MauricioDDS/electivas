import os, requests
from rest_framework import status, views
from rest_framework.response import Response
from .serializers import CupoRequestSerializer
from .models import CupoRequest
from .tasks import send_cupo_email
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.views import APIView

GROUPS_BASE_URL = os.getenv("GROUPS_BASE_URL", "http://groups-ms:8000")

class CupoCheckView(views.APIView):
    """
    POST /api/requests/check-and-email/
    Payload mínimo:
    {
      "student_email": "andresjulianoj@ufps.edu.co",
      "course_id": 101,
      "group_id": 12,           # preferible
      "group_code": "A"         # opcional si no pasas group_id
    }
    Regla demo: si el grupo no tiene cupos disponibles, dispara email.
    """
    def post(self, request):
        data = request.data.copy()

        # 1) Consultar grupo en groups-ms
        group_json = None
        try:
            if data.get("group_id"):
                url = f"{GROUPS_BASE_URL}/api/groups/{data['group_id']}/"
                r = requests.get(url, timeout=6)
                r.raise_for_status()
                group_json = r.json()
            else:
                # fallback por course_id + group_code (si implementas filtros después)
                # de momento, intentamos listar y filtrar client-side:
                url = f"{GROUPS_BASE_URL}/api/groups/"
                r = requests.get(url, timeout=6)
                r.raise_for_status()
                items = r.json()
                course_id = int(data.get("course_id"))
                group_code = data.get("group_code", "").strip()
                for g in items:
                    if g.get("course_id")==course_id and g.get("group_code")==group_code:
                        group_json = g
                        break
        except Exception as e:
            return Response({"detail": f"Error consultando groups-ms: {e}"}, status=502)

        if not group_json:
            return Response({"detail": "Grupo no encontrado"}, status=404)

        # 2) Regla 'sin cupo'
        capacity = group_json.get("capacity", 0)
        enrolled = group_json.get("enrolled", 0)  # si no existe, se asume 0
        available = capacity - enrolled
        has_quota = available > 0

        # Si SÍ hay cupo, no enviamos correo (y devolvemos info)
        if has_quota:
            return Response({
                "has_quota": True,
                "available": available,
                "message": "El grupo aún tiene cupos; no se envía correo."
            }, status=200)

        # 3) Persistir solicitud + enviar correo
        data["message"] = data.get("message") or (
            "Solicitud para aumentar el cupo: "
            f"Materia (course_id={data.get('course_id')}), "
            f"Grupo ({data.get('group_id') or data.get('group_code','')})."
        )
        ser = CupoRequestSerializer(data=data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(status="sent")

        # destinatario de prueba (dirección del programa)
        to_email = os.getenv("PROGRAM_EMAIL", "andresjulianoj@ufps.edu.co")
        subject = "Solicitud para aumentar el cupo"
        body = (
            "Solicitud para aumentar el cupo\n\n"
            f"Estudiante: {obj.student_email}\n"
            f"Materia (course_id): {obj.course_id}\n"
            f"Grupo: {obj.group_id or obj.group_code}\n\n"
            "Mensaje:\n"
            f"{obj.message}\n"
        )

        # Celery async
        send_cupo_email.delay(subject, body, to_email)

        return Response({
            "has_quota": False,
            "available": available,
            "email_to": to_email,
            "request": CupoRequestSerializer(obj).data
        }, status=201)

class TestEmailView(APIView):
    """
    POST /api/test-email/
    Body JSON:
      {
        "to": "destinatario@dominio.com",   # opcional (default = settings.PROGRAM_EMAIL)
        "subject": "Prueba SMTP",            # opcional
        "message": "Hola, este es un test."  # opcional
      }
    """

    def post(self, request):
        to = request.data.get("to") or getattr(settings, "PROGRAM_EMAIL", None)
        subject = request.data.get("subject", "Prueba SMTP (requests-ms)")
        message = request.data.get("message", "Hola, este es un correo de prueba desde requests-ms.")

        if not to:
            return Response(
                {"detail": "No se encontró destinatario. Pasa 'to' o define PROGRAM_EMAIL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sent = send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [to],
            fail_silently=False,
        )
        return Response({"sent": sent, "to": to}, status=status.HTTP_200_OK)