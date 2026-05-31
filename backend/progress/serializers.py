import uuid

from django.utils import timezone
from rest_framework import serializers

from mountains.serializers import MountainSerializer

from .models import RouteLog, UserMountainLog


class UserMountainLogSerializer(serializers.ModelSerializer):
    mountain_detail = MountainSerializer(source="mountain", read_only=True)

    # Route context — read-only, surfaced so the frontend can show
    # "Logged as part of X route" in ascent history
    route_name = serializers.SerializerMethodField()

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
            "route_group",
            "route_group_id_ref",
            "is_route_primary",
            "route_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "route_group",
            "route_group_id_ref",
            "is_route_primary",
            "route_name",
            "created_at",
            "updated_at",
        ]

    def get_route_name(self, obj):
        if obj.route_group:
            return obj.route_group.name
        return None

    def validate_completed_date(self, value):
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


class RouteLogSerializer(serializers.Serializer):
    """
    Accepts a multi-mountain route submission and creates:
      - one RouteLog record
      - one UserMountainLog per mountain (linked by route_group + shared UUID)
      - cumulative stats stored only on the primary summit log
    """

    # Route metadata
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False, default="")
    completed_date = serializers.DateField()
    season = serializers.ChoiceField(
        choices=["summer", "winter", "spring", "autumn"],
        allow_blank=True,
        required=False,
        default="",
    )

    # Mountains: ordered list of mountain IDs
    mountain_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=2,
        error_messages={"min_length": "A route must include at least 2 mountains."},
    )

    # The mountain ID that carries the cumulative stats
    primary_mountain_id = serializers.IntegerField()

    # Cumulative stats — stored on the primary summit only
    route_taken = serializers.CharField(max_length=255, allow_blank=True, required=False, default="")
    hike_distance_km = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True, default=None,
    )
    hike_duration_hours = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True, default=None,
    )
    steps = serializers.IntegerField(required=False, allow_null=True, default=None)
    flights_climbed = serializers.IntegerField(required=False, allow_null=True, default=None)
    notes = serializers.CharField(allow_blank=True, required=False, default="")

    def validate_completed_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Completed date cannot be in the future.")
        return value

    def validate(self, data):
        if data["primary_mountain_id"] not in data["mountain_ids"]:
            raise serializers.ValidationError(
                {"primary_mountain_id": "Primary mountain must be one of the selected mountains."}
            )
        if data.get("hike_distance_km") is not None and data["hike_distance_km"] < 0:
            raise serializers.ValidationError({"hike_distance_km": "Distance cannot be negative."})
        if data.get("hike_duration_hours") is not None and data["hike_duration_hours"] < 0:
            raise serializers.ValidationError({"hike_duration_hours": "Duration cannot be negative."})
        return data

    def create(self, validated_data):
        user = self.context["request"].user

        # 1. Create the RouteLog record
        route_log = RouteLog.objects.create(
            user=user,
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            completed_date=validated_data["completed_date"],
        )

        # 2. Shared UUID for all logs in this session
        shared_uuid = uuid.uuid4()

        mountain_ids = validated_data["mountain_ids"]
        primary_id = validated_data["primary_mountain_id"]

        created_logs = []

        for mountain_id in mountain_ids:
            is_primary = mountain_id == primary_id

            log = UserMountainLog.objects.create(
                user=user,
                mountain_id=mountain_id,
                route_group=route_log,
                route_group_id_ref=shared_uuid,
                is_route_primary=is_primary,
                status="completed",
                completed_date=validated_data["completed_date"],
                season=validated_data.get("season", ""),
                # Stats only on primary summit
                route_taken=validated_data.get("route_taken", "") if is_primary else "",
                hike_distance_km=validated_data.get("hike_distance_km") if is_primary else None,
                hike_duration_hours=validated_data.get("hike_duration_hours") if is_primary else None,
                steps=validated_data.get("steps") if is_primary else None,
                flights_climbed=validated_data.get("flights_climbed") if is_primary else None,
                notes=validated_data.get("notes", "") if is_primary else "",
            )
            created_logs.append(log)

        return route_log, created_logs


class RouteLogResponseSerializer(serializers.ModelSerializer):
    """Serializes the RouteLog for the response after creation."""
    mountain_log_ids = serializers.SerializerMethodField()
    mountains_count = serializers.SerializerMethodField()

    class Meta:
        model = RouteLog
        fields = [
            "id",
            "name",
            "description",
            "completed_date",
            "mountains_count",
            "mountain_log_ids",
            "created_at",
        ]

    def get_mountain_log_ids(self, obj):
        return list(obj.mountain_logs.values_list("id", flat=True))

    def get_mountains_count(self, obj):
        return obj.mountain_logs.count()
