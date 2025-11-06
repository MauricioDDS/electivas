FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV DJANGO_SETTINGS_MODULE=groups_service.settings
CMD ["sh","-c","python manage.py migrate --noinput && gunicorn groups_service.wsgi:application --bind 0.0.0.0:8000"]
