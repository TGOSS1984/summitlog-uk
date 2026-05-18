from django.contrib import admin

from .models import UserMountainLog


@admin.register(UserMountainLog)
class UserMountainLogAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "mountain",
        "status",
        "completed_date",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "user__username",
        "mountain__name",
    )