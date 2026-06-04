import uuid

from django.conf import settings
from django.db import models

from mountains.models import Mountain


class RouteLog(models.Model):
    """
    Represents a named multi-mountain route (e.g. Fairfield Horseshoe).
    Individual UserMountainLog entries are linked back here via route_group_id.
    """

    STATUS_CHOICES = [
        ("planned",   "Planned"),
        ("completed", "Completed"),
    ]

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

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="completed",
        help_text="Whether this route has been completed or is being planned.",
    )

    # Now nullable so planned routes don't require a completed date.
    # For completed routes this is the actual date; for planned routes it
    # doubles as the intended/target date.
    completed_date = models.DateField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-completed_date", "-created_at"]

    def __str__(self):
        return f"{self.user} — {self.name} ({self.completed_date or 'no date'})"


class UserMountainLog(models.Model):

    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("planned",     "Planned"),
        ("completed",   "Completed"),
    ]

    SEASON_CHOICES = [
        ("summer", "Summer"),
        ("winter", "Winter"),
        ("spring", "Spring"),
        ("autumn", "Autumn"),
    ]

    CONDITIONS_CHOICES = [
        ("clear",   "Clear & sunny"),
        ("good",    "Good visibility"),
        ("misty",   "Misty / low cloud"),
        ("rain",    "Rain / wet"),
        ("snow",    "Snow / ice"),
        ("winter",  "Full winter conditions"),
        ("storm",   "Storm / poor conditions"),
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

    conditions = models.CharField(
        max_length=20,
        choices=CONDITIONS_CHOICES,
        blank=True,
        help_text="Weather/visibility conditions on the day of the ascent.",
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


class UserCollectionNote(models.Model):
    """
    A personal note a user attaches to a collection, e.g.
    'Started Wainwrights July 2024, aiming to finish by 2027'.
    One note per user per collection (upsert pattern).

    Stored with collection_id_ref + collection_slug rather than a FK
    to avoid coupling to the mountains app's internal model name.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="collection_notes",
    )

    # Reference to the collection — stored as ID + slug, no FK needed
    collection_id_ref = models.PositiveIntegerField(
        db_index=True,
        help_text="ID of the collection this note belongs to.",
    )
    collection_slug = models.CharField(
        max_length=120,
        db_index=True,
        help_text="Slug of the collection, for lookups without a join.",
    )

    body = models.TextField(
        blank=True,
        help_text="Personal note about progress on this collection.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "collection_id_ref")]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} — note on collection {self.collection_id_ref}"


class NotificationPreference(models.Model):
    """
    Per-user notification preferences.
    Created on first access via get_or_create — never manually instantiated.
    One row per user; update via the PATCH /api/progress/notifications/ endpoint.
    """

    DAYS_CHOICES = [
        (1, "1 day before"),
        (2, "2 days before"),
        (3, "3 days before"),
        (7, "1 week before"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )

    email_reminders_enabled = models.BooleanField(
        default=False,
        help_text="Send email reminders for upcoming planned summits.",
    )

    reminder_days_before = models.PositiveIntegerField(
        default=3,
        help_text=(
            "How many days before the planned date to send the reminder. "
            "Validated to be one of 1, 2, 3, or 7."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        status = "on" if self.email_reminders_enabled else "off"
        return f"{self.user} — reminders {status} ({self.reminder_days_before}d before)"
