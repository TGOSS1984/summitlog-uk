from django.contrib import admin

from .models import (
    Mountain,
    MountainCollection,
    MountainCollectionMembership,
    Region,
    SubRegion,
)


@admin.register(MountainCollection)
class MountainCollectionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "expected_total")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(SubRegion)
class SubRegionAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "slug")
    list_filter = ("region",)
    search_fields = ("name", "region__name")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Mountain)
class MountainAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "collection",
        "region",
        "subregion",
        "height_m",
        "rank_in_collection",
    )
    list_filter = ("collection", "region", "subregion")
    search_fields = ("name", "collection__name", "region__name")
    prepopulated_fields = {"slug": ("name",)}

@admin.register(MountainCollectionMembership)
class MountainCollectionMembershipAdmin(admin.ModelAdmin):
    list_display = ("mountain", "collection", "rank_in_collection")
    list_filter = ("collection",)
    search_fields = ("mountain__name", "collection__name")