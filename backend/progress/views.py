import csv
import io

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RouteLog, UserMountainLog
from .serializers import (
    RouteLogResponseSerializer,
    RouteLogSerializer,
    UserMountainLogSerializer,
)


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
            "route_group",
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
            "route_group",
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"detail": "Log deleted successfully."},
            status=status.HTTP_200_OK,
        )


class RouteLogCreateView(APIView):
    """
    POST /api/progress/routes/

    Creates a RouteLog + one UserMountainLog per mountain.
    Cumulative stats are stored on the primary summit only.
    All individual logs share a route_group FK and a route_group_id_ref UUID.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RouteLogSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        route_log, created_logs = serializer.save()

        response_data = RouteLogResponseSerializer(route_log).data
        response_data["message"] = (
            f"Route '{route_log.name}' logged — "
            f"{len(created_logs)} summits marked as completed."
        )

        return Response(response_data, status=status.HTTP_201_CREATED)


class UserRouteLogListView(generics.ListAPIView):
    """
    GET /api/progress/routes/

    Returns all route logs for the authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RouteLog.objects.filter(user=self.request.user).prefetch_related(
            "mountain_logs",
            "mountain_logs__mountain",
            "mountain_logs__mountain__region",
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for route in queryset:
            mountains = [
                {
                    "id": log.mountain.id,
                    "name": log.mountain.name,
                    "slug": log.mountain.slug,
                    "height_m": log.mountain.height_m,
                    "is_primary": log.is_route_primary,
                }
                for log in route.mountain_logs.select_related("mountain").order_by(
                    "-is_route_primary", "mountain__name"
                )
            ]
            data.append(
                {
                    "id": route.id,
                    "name": route.name,
                    "description": route.description,
                    "completed_date": route.completed_date,
                    "mountains": mountains,
                    "mountains_count": len(mountains),
                    "created_at": route.created_at,
                }
            )
        return Response(data)


@method_decorator(login_required, name="dispatch")
class ExportLogsView(View):

    def get(self, request):
        export_format = request.GET.get("format", "csv").lower()
        logs = UserMountainLog.objects.filter(
            user=request.user,
            status="completed",
        ).select_related(
            "mountain",
            "mountain__region",
            "mountain__collection",
            "route_group",
        ).order_by("-completed_date")

        if export_format == "gpx":
            return self._export_gpx(logs)
        return self._export_csv(logs)

    def _export_csv(self, logs):
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Mountain",
            "Region",
            "Collection",
            "Height (m)",
            "Height (ft)",
            "Completed Date",
            "Season",
            "Route Name",
            "Route Taken",
            "Distance (km)",
            "Duration (hrs)",
            "Steps",
            "Flights Climbed",
            "Notes",
            "Latitude",
            "Longitude",
        ])

        for log in logs:
            m = log.mountain
            writer.writerow([
                m.name,
                m.region.name if m.region else "",
                m.collection.name if m.collection else "",
                m.height_m or "",
                m.height_ft or "",
                log.completed_date or "",
                log.season or "",
                log.route_group.name if log.route_group else "",
                log.route_taken or "",
                log.hike_distance_km or "",
                log.hike_duration_hours or "",
                log.steps or "",
                log.flights_climbed or "",
                log.notes or "",
                m.latitude if hasattr(m, "latitude") else "",
                m.longitude if hasattr(m, "longitude") else "",
            ])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="summitlog-completed.csv"'
        return response

    def _export_gpx(self, logs):
        import gpxpy
        import gpxpy.gpx

        gpx = gpxpy.gpx.GPX()
        gpx.name = "SummitLog UK — Completed Summits"
        gpx.description = f"Exported {logs.count()} completed summits"

        for log in logs:
            m = log.mountain
            lat = getattr(m, "latitude", None)
            lon = getattr(m, "longitude", None)

            if not lat or not lon:
                continue

            route_context = f" (part of {log.route_group.name})" if log.route_group else ""
            waypoint = gpxpy.gpx.GPXWaypoint(
                latitude=float(lat),
                longitude=float(lon),
                elevation=float(m.height_m) if m.height_m else None,
                name=m.name,
                description=(
                    f"{m.region.name if m.region else ''} — "
                    f"{log.completed_date or 'No date'} — "
                    f"{log.route_taken or 'No route'}"
                    f"{route_context}"
                ),
                time=None,
            )
            gpx.waypoints.append(waypoint)

        response = HttpResponse(gpx.to_xml(), content_type="application/gpx+xml")
        response["Content-Disposition"] = 'attachment; filename="summitlog-completed.gpx"'
        return response
