from django.db import models

class Group(models.Model):
    course_id = models.IntegerField()
    term = models.CharField(max_length=20)
    group_code = models.CharField(max_length=10)
    teacher_id = models.IntegerField()
    capacity = models.IntegerField()
    status = models.CharField(max_length=20, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "groups"
        db_table = "groups_group"

    def __str__(self):
        return f"{self.course_id} - {self.group_code}"


class GroupSchedule(models.Model):
    DAYS = [
        ("MON", "Lun"),
        ("TUE", "Mar"),
        ("WED", "Mié"),
        ("THU", "Jue"),
        ("FRI", "Vie"),
        ("SAT", "Sáb"),
        ("SUN", "Dom"),
    ]

    group = models.ForeignKey(Group, related_name="schedule", on_delete=models.CASCADE)
    day = models.CharField(max_length=3, choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        app_label = "groups"  # 👈 Corrige este valor
        db_table = "groups_schedule"

    def __str__(self):
        return f"{self.group} - {self.day} ({self.start_time}-{self.end_time})"
