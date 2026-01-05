# Electivas — Plataforma de gestión académica (microservicios)

Proyecto de microservicios para gestionar información académica, sincronizarla con el portal oficial (Divisist) y permitir a estudiantes crear y gestionar bocetos de horarios. Diseñado para separar responsabilidades (autenticación, datos de materias, horarios, ramas, scraping) y facilitar despliegue escalable.

## Resumen rápido
- Propósito: centralizar y exponer la oferta académica, autenticación de usuarios y herramientas para construir horarios personalizados, manteniendo los datos sincronizados con Divisist.
- Arquitectura: conjunto de microservicios independientes comunicándose por APIs REST y autenticados por JWT.

## Microservicios (visión general)
- auth-service — Autenticación y gestión de usuarios (emisión/validación JWT).
- courses-service — Almacena y expone la información académica (materias, grupos, sincronización con scraper).
- schedules-service — Creación y validación de bocetos de horarios del estudiante.
- specializations-service — Gestión de ramas de especialización y electivas.
- scraper-service — Extracción automática de Divisist; alimenta el resto de servicios.
- email-worker — Envío de notificaciones y tareas en background.

## Tecnologías principales
- Backends: Django REST Framework, FastAPI y Node/TypeScript según servicio.
- Persistencia: PostgreSQL.
- Autenticación: JWT.
- Orquestación local: Docker + docker-compose.