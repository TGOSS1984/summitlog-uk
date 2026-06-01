import uuid
from datetime import date as date_type

from django.utils import timezone
from rest_framework import serializers

from mountains.serializers import MountainSerializer

from .models import RouteLog, UserCollectionNote, UserMountainLog


class UserMountainLogSerializer(serializers.ModelSerializer):
    mountain_detail = MountainSerializer(source="mountain", read_only=True)

    route_name = serializers.SerializerMethodField()

    class Meta:
        model = UserMountainLog
        fields = [
            "id",
            "mountain",
            "mountain_detail",
            "status",
            "season",
            "conditions",
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

    def validate(self, data):
        # Future-date check only applies to completed logs.
        # Planned logs legitimately use completed_date as a target/intended date.
        completed_date = data.get("completed_date")
        if completed_date and data.get("status") == "completed":
            if completed_date > timezone.now().date():
                raise serializers.ValidationError(
                    {"completed_date": "Completed date cannot be in the future."}
                )
        return data

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


# ── Share serializer — read-only, used by the public share endpoint ──────────

class ShareLogSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a single log for public sharing.
    Deliberately omits user identity.
    """
    mountain_detail = MountainSerializer(source="mountain", read_only=True)

    class Meta:
        model = UserMountainLog
        fields = [
            "id",
            "mountain",
            "mountain_detail",
            "status",
            "season",
            "conditions",
            "completed_date",
            "route_taken",
            "hike_distance_km",
            "hike_duration_hours",
            "steps",
            "flights_climbed",
            "notes",
            "uploaded_image",
        ]


# ── Collection note serializer ───────────────────────────────────────────────

class UserCollectionNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCollectionNote
        fields = [
            "id",
            "collection_id_ref",
            "collection_slug",
            "body",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ── Route serializers ────────────────────────────────────────────────────────

class RouteLogSerializer(serializers.Serializer):
    """
    Accepts a multi-mountain route submission (planned or completed) and creates:
      - one RouteLog record
      - one UserMountainLog per mountain (linked by route_group + shared UUID)
      - cumulative stats stored only on the primary summit log (if provided)
    """

    # Route metadata
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False, default="")

    # planned | completed
    status = serializers.ChoiceField(
        choices=["planned", "completed"],
        default="completed",
    )

    # Optional for planned routes (used as target date when status=planned)
    completed_date = serializers.DateField(required=False, allow_null=True, default=None)

    season = serializers.ChoiceField(
        choices=["summer", "winter", "spring", "autumn"],
        allow_blank=True,
        required=False,
        default="",
    )
    conditions = serializers.ChoiceField(
        choices=["clear", "good", "misty", "rain", "snow", "winter", "storm"],
        allow_blank=True,
        required=False,
        default="",
    )

    # Mountains: ordered list of mountain IDs (min 2)
    mountain_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=2,
        error_messages={"min_length": "A route must include at least 2 mountains."},
    )

    # The mountain that carries the cumulative stats
    primary_mountain_id = serializers.IntegerField()

    # Cumulative stats — all optional, stored on primary summit only
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

    def validate(self, data):
        route_status = data.get("status", "completed")
        completed_date = data.get("completed_date")

        # Completed routes must have a date and it cannot be in the future
        if route_status == "completed":
            if not completed_date:
                raise serializers.ValidationError(
                    {"completed_date": "A date is required for completed routes."}
                )
            if completed_date > timezone.now().date():
                raise serializers.ValidationError(
                    {"completed_date": "Completed date cannot be in the future."}
                )

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
        route_status = validated_data.get("status", "completed")

        route_log = RouteLog.objects.create(
            user=user,
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            status=route_status,
            completed_date=validated_data.get("completed_date"),
        )

        shared_uuid  = uuid.uuid4()
        mountain_ids = validated_data["mountain_ids"]
        primary_id   = validated_data["primary_mountain_id"]

        # Mountain logs mirror the route status
        log_status = "completed" if route_status == "completed" else "planned"

        created_logs = []
        for mountain_id in mountain_ids:
            is_primary = mountain_id == primary_id

            log = UserMountainLog.objects.create(
                user=user,
                mountain_id=mountain_id,
                route_group=route_log,
                route_group_id_ref=shared_uuid,
                is_route_primary=is_primary,
                status=log_status,
                completed_date=validated_data.get("completed_date"),
                season=validated_data.get("season", ""),
                # Conditions + stats only on primary summit
                conditions=validated_data.get("conditions", "") if is_primary else "",
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
    """Serializes the RouteLog for the response after creation or retrieval."""
    mountain_log_ids = serializers.SerializerMethodField()
    mountains_count  = serializers.SerializerMethodField()

    class Meta:
        model = RouteLog
        fields = [
            "id",
            "name",
            "description",
            "status",
            "completed_date",
            "mountains_count",
            "mountain_log_ids",
            "created_at",
        ]

    def get_mountain_log_ids(self, obj):
        return list(obj.mountain_logs.values_list("id", flat=True))

    def get_mountains_count(self, obj):
        return obj.mountain_logs.count()