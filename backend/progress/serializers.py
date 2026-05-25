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
            "season",
            "completed_date",
            "route_taken",
            "hike_distance_km",
            "hike_duration_hours",
            "steps",
            "flights_climbed",
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

    def validate_completed_date(self, value):
        from django.utils import timezone
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Completed date cannot be in the future.")
        return value

    def validate_hike_distance_km(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Distance cannot be negative.")
        return value

    def validate_hike_duration_hours(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Duration cannot be negative.")
        return value

    def validate_steps(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Steps cannot be negative.")
        return value