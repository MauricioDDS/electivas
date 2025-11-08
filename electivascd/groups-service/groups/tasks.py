import requests
from django.conf import settings
from django.core.mail import send_mail
from celery import shared_task

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def notify_group_published(self, payload: dict):
    """
    payload = {
      "group": {...},   # dict serializado de Group
    }
    1) buscar estudiantes en auth-ms
    2) enviar correo en lote (simple, uno a uno para MVP)
    """
    try:
        auth_base = settings.AUTH_BASE_URL.rstrip("/")
        # auth-ms: necesitamos estudiantes (role=ESTUDIANTE)
        res = requests.get(f"{auth_base}/users/", params={"role": "ESTUDIANTE"}, timeout=10)
        res.raise_for_status()
        students = res.json()  # [{id,email,...}]
    except Exception as e:
        raise self.retry(exc=e)

    g = payload["group"]
    subject = f"Disponibilidad: {g['course_code']} - Grupo {g['group_code']} ({g['term']})"
    html = (
        f"<p>¡Hay nuevos cupos!</p>"
        f"<p><b>{g['course_code']} - {g['course_name']}</b></p>"
        f"<p>Grupo: {g['group_code']} — Capacidad: {g['capacity']}</p>"
    )

    # MVP: envío sencillo
    for s in students:
        email = s.get("email")
        if not email:
            continue
        send_mail(
            subject=subject,
            message="",
            html_message=html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
