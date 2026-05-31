import uuid

from django.conf import settings
from django.db import models

from mountains.models import Mountain


class RouteLog(models.Model):
    """
    Represents a named multi-mountain route (e.g. Fairfield Horseshoe).
    Individual UserMountainLog entries are linked back here via route_group_id.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="route_logs",
    )

    name = models.CharField(
        max_length=255,
        help_text="Name of the route, e.g. 'Fairfield Horseshoe'",
    )

    description = models.TextField(
        blank=True,
        help_text="Optional notes about the route.",
    )

    completed_date = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-completed_date", "-created_at"]

    def __str__(self):
        return f"{self.user} — {self.name} ({self.completed_date})"


class UserMountainLog(models.Model):

    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("planned", "Planned"),
        ("completed", "Completed"),
    ]

    SEASON_CHOICES = [
        ("summer", "Summer"),
        ("winter", "Winter"),
        ("spring", "Spring"),
        ("autumn", "Autumn"),
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

    # Links this log back to its RouteLog when created as part of a route
    route_group = models.ForeignKey(
        RouteLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mountain_logs",
        help_text="Set when this log was created as part of a multi-mountain route.",
    )

    # Stable UUID so all logs from one route session share an identifier
    # even if the RouteLog is later deleted
    route_group_id_ref = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Shared UUID across all logs created in the same route session.",
    )

    # Flag: this is the primary summit for the route (stats stored here)
    is_route_primary = models.BooleanField(
        default=False,
        help_text="True for the highest peak on a multi-mountain route (stats stored here).",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="not_started",
    )

    season = models.CharField(
        max_length=10,
        choices=SEASON_CHOICES,
        blank=True,
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-completed_date", "-updated_at"]

    def __str__(self):
        date = self.completed_date or "no date"
        return f"{self.user} - {self.mountain} ({date})"
