from django.db import models

class CupoRequest(models.Model):
    student_email = models.EmailField()
    course_id = models.IntegerField()
    group_id = models.IntegerField(null=True, blank=True)   # si lo tienes
    group_code = models.CharField(max_length=16, blank=True, default="")  # o código de grupo
    message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, default="sent")  # sent | failed

    class Meta:
        db_table = "requests_cupo"

    def __str__(self):
        return f"{self.student_email} -> course:{self.course_id} group:{self.group_id or self.group_code}"
