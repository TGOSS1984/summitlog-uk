from rest_framework import serializers

from .models import (
    Mountain,
    MountainCollection,
    MountainCollectionMembership,
    Region,
    SubRegion,
)


class MountainCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MountainCollection
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "expected_total",
        ]


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = [
            "id",
            "name",
            "slug",
            "description",
        ]


class SubRegionSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)

    class Meta:
        model = SubRegion
        fields = [
            "id",
            "name",
            "slug",
            "region",
            "description",
        ]


class MountainCollectionMembershipSerializer(serializers.ModelSerializer):
    collection = MountainCollectionSerializer(read_only=True)

    class Meta:
        model = MountainCollectionMembership
        fields = [
            "id",
            "collection",
            "rank_in_collection",
        ]


class MountainSerializer(serializers.ModelSerializer):
    collection = MountainCollectionSerializer(read_only=True)
    region = RegionSerializer(read_only=True)
    subregion = SubRegionSerializer(read_only=True)
    collection_memberships = MountainCollectionMembershipSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Mountain
        fields = [
            "id",
            "name",
            "slug",
            "collection",
            "collection_memberships",
            "region",
            "subregion",
            "height_m",
            "height_ft",
            "prominence_m",
            "rank_in_collection",
            "latitude",
            "longitude",
            "summary",
            "image_placeholder",
        ]