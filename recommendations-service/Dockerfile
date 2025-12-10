FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# OJO: ahora el contexto es la raíz del proyecto,
# así que hay que usar la ruta completa relativa al contexto.
COPY recommendations-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Solo copiamos la carpeta del servicio, no todo el repo.
COPY recommendations-service/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
