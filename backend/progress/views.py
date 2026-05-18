from rest_framework import generics, permissions

from .models import UserMountainLog
from .serializers import UserMountainLogSerializer


class UserMountainLogListCreateView(generics.ListCreateAPIView):
    serializer_class = UserMountainLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMountainLog.objects.filter(
            user=self.request.user,
        ).select_related(
            "mountain",
            "mountain__collection",
            "mountain__region",
            "mountain__subregion",
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserMountainLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserMountainLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMountainLog.objects.filter(
            user=self.request.user,
        ).select_related(
            "mountain",
            "mountain__collection",
            "mountain__region",
            "mountain__subregion",
        )