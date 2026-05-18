from rest_framework import serializers

from mountains.serializers import MountainSerializer

from .models import UserMountainLog


class UserMountainLogSerializer(serializers.ModelSerializer):
    mountain_detail = MountainSerializer(source="mountain", read_only=True)

    class Meta:
        model = UserMountainLog
        fields = [
            "id",
            "mountain",
            "mountain_detail",
            "status",
            "completed_date",
            "route_taken",
            "hike_distance_km",
            "hike_duration_hours",
            "notes",
            "uploaded_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]