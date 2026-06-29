import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
    )
    bio = models.TextField(blank=True)

    # Public sharing — a permanent per-user token used to build shareable
    # read-only links to the dashboard and progress list. The token always
    # exists once a profile is created; sharing_enabled is the actual
    # on/off switch the public endpoints check before returning any data.
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    sharing_enabled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} profile"