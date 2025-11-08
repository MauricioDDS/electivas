FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
CMD ["sh","-c","python manage.py migrate --noinput && gunicorn requests_service.wsgi:application --bind 0.0.0.0:8000"]
