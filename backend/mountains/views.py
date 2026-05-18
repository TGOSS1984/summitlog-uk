from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import generics

from .models import Mountain, MountainCollection, Region, SubRegion
from .serializers import (
    MountainCollectionSerializer,
    MountainSerializer,
    RegionSerializer,
    SubRegionSerializer,
)


class MountainCollectionListView(generics.ListAPIView):
    queryset = MountainCollection.objects.all()
    serializer_class = MountainCollectionSerializer


class RegionListView(generics.ListAPIView):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer


class SubRegionListView(generics.ListAPIView):
    queryset = SubRegion.objects.select_related("region").all()
    serializer_class = SubRegionSerializer


class MountainListView(generics.ListAPIView):
    queryset = Mountain.objects.select_related(
        "collection",
        "region",
        "subregion",
    ).all()
    serializer_class = MountainSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter,
    ]
    filterset_fields = [
        "collection__slug",
        "region__slug",
        "subregion__slug",
    ]
    ordering_fields = [
        "name",
        "height_m",
        "height_ft",
        "rank_in_collection",
    ]
    search_fields = [
        "name",
        "summary",
        "region__name",
        "collection__name",
        "subregion__name",
    ]


class MountainDetailView(generics.RetrieveAPIView):
    queryset = Mountain.objects.select_related(
        "collection",
        "region",
        "subregion",
    ).all()
    serializer_class = MountainSerializer
    lookup_field = "slug"