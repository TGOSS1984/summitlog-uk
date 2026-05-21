from django.conf import settings
from django.db import models

from mountains.models import Mountain


class UserMountainLog(models.Model):

    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("planned", "Planned"),
        ("completed", "Completed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mountain_logs",
    )

    mountain = models.ForeignKey(
        Mountain,
        on_delete=models.CASCADE,
        related_name="user_logs",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="not_started",
    )

    completed_date = models.DateField(
        blank=True,
        null=True,
    )

    route_taken = models.CharField(
        max_length=255,
        blank=True,
    )

    hike_distance_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
    )

    hike_duration_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
    )

    steps = models.PositiveIntegerField(
        blank=True,
        null=True,
    )

    flights_climbed = models.PositiveIntegerField(
        blank=True,
        null=True,
    )

    notes = models.TextField(
        blank=True,
    )

    uploaded_image = models.ImageField(
        upload_to="mountain_logs/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        unique_together = ["user", "mountain"]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} - {self.mountain}"