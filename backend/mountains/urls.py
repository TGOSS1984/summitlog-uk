from django.urls import path

from .views import (
    MountainCollectionListView,
    MountainDetailView,
    MountainListView,
    RegionListView,
    SubRegionListView,
)


urlpatterns = [
    path("collections/", MountainCollectionListView.as_view(), name="collection-list"),
    path("regions/", RegionListView.as_view(), name="region-list"),
    path("subregions/", SubRegionListView.as_view(), name="subregion-list"),
    path("mountains/", MountainListView.as_view(), name="mountain-list"),
    path("mountains/<slug:slug>/", MountainDetailView.as_view(), name="mountain-detail"),
]