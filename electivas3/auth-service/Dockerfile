# Base image
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=auth_service.settings

# Expose port
EXPOSE 8000

# Run migrations before starting Gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn auth_service.wsgi:application --bind 0.0.0.0:8000"]
