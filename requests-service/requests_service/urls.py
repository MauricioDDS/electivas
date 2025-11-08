from django.urls import path, include

urlpatterns = [
    path("api/requests/", include("requests_app.urls")),
]
