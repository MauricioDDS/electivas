from django.core.mail import send_mail
from celery import shared_task

@shared_task
def send_cupo_email(subject, body, to_email):
    # usa EMAIL_* de settings
    sent = send_mail(
        subject=subject,
        message=body,
        from_email=None,  # usa DEFAULT_FROM_EMAIL
        recipient_list=[to_email],
        fail_silently=False,
    )
    return bool(sent)
