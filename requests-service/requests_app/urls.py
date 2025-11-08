from django.urls import path
from .views import CupoCheckView
from requests_app.views import TestEmailView

urlpatterns = [
    path("check-and-email/", CupoCheckView.as_view(), name="check_and_email"),
    path("api/test-email/", TestEmailView.as_view()),
]
