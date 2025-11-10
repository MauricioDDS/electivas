import pika, time, os, json, smtplib, requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
EMAIL_QUEUE = os.getenv("EMAIL_QUEUE", "email_queue")
NEW_GROUP_QUEUE = os.getenv("NEW_GROUP_QUEUE", "new_group_notification")

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000/api/auth/users/")

def send_email(to_email, subject, body):
    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
    print(f"[worker] Email sent to {to_email}")

def handle_email_queue(data):
    """Handles standard queued emails (cupos, etc.)"""
    send_email(data["to"], data["subject"], data["body"])

def handle_new_group_notification(data):
    """Handles new group notifications"""
    print("[worker] Handling new group notification...")

    try:
        response = requests.get(AUTH_SERVICE_URL)
        response.raise_for_status()
        students = response.json()

        subject = f"Nueva disponibilidad en {data.get('course_name', 'una materia')}"
        body = (
            f"Se ha abierto el grupo {data.get('group_name', 'N/A')} "
            f"({data.get('schedule', 'horario no especificado')}) "
            f"con {data.get('available_slots', '?')} cupos disponibles."
        )

        count = 0
        for student in students:
            email = student.get("email")
            if email:
                send_email(email, subject, body)
                count += 1

        print(f"[worker] Sent notifications to {count} students.")
    except Exception as e:
        print(f"[worker] Error notifying students: {e}")

def main():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    params = pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)

    for attempt in range(10):
        try:
            connection = pika.BlockingConnection(params)
            break
        except pika.exceptions.AMQPConnectionError:
            print(f"[worker] RabbitMQ not ready, retrying ({attempt+1}/10)...")
            time.sleep(5)
    else:
        print("[worker] Failed to connect to RabbitMQ after retries.")
        return

    channel = connection.channel()
    channel.queue_declare(queue=EMAIL_QUEUE, durable=True)
    channel.queue_declare(queue=NEW_GROUP_QUEUE, durable=True)

    print("[worker] Waiting for messages on both queues...")

    def callback(ch, method, properties, body):
        try:
            data = json.loads(body)
            print(f"[worker] Processing message: {data}")

            if method.routing_key == EMAIL_QUEUE or data.get("type") == "email":
                handle_email_queue(data)
            elif method.routing_key == NEW_GROUP_QUEUE or data.get("type") == "new_group":
                handle_new_group_notification(data)
            else:
                print(f"[worker] Unknown message type or queue: {method.routing_key}")

            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"[worker] Error: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=EMAIL_QUEUE, on_message_callback=callback)
    channel.basic_consume(queue=NEW_GROUP_QUEUE, on_message_callback=callback)

    channel.start_consuming()

if __name__ == "__main__":
    main()
