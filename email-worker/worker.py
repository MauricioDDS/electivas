import pika, time, os, json, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
EMAIL_QUEUE = os.getenv("EMAIL_QUEUE", "email_queue")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

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

def main():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    params = pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)

    # 🔁 Retry logic
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
    print("[worker] Waiting for messages...")

    def callback(ch, method, properties, body):
        try:
            data = json.loads(body)
            print(f"[worker] Processing: {data}")
            send_email(data["to"], data["subject"], data["body"])
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"[worker] Error: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=EMAIL_QUEUE, on_message_callback=callback)
    channel.start_consuming()

if __name__ == "__main__":
    main()
