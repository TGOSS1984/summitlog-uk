import csv
import io
from datetime import datetime

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from mountains.models import Mountain

from .models import RouteLog, UserCollectionNote, UserMountainLog
from .serializers import (
    RouteLogResponseSerializer,
    RouteLogSerializer,
    ShareLogSerializer,
    UserCollectionNoteSerializer,
    UserMountainLogSerializer,
)


# ── Individual mountain log CRUD ─────────────────────────────────────────────

class UserMountainLogListCreateView(generics.ListCreateAPIView):
    serializer_class = UserMountainLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMountainLog.objects.filter(
            user=self.request.user,
        ).select_related(
            "mountain", "mountain__collection",
            "mountain__region", "mountain__subregion", "route_group",
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
            "mountain", "mountain__collection",
            "mountain__region", "mountain__subregion", "route_group",
        )

    def partial_update(self, request, *args, **kwargs):
        """
        Handle clear_image flag — clears the uploaded_image field without
        going through the serializer.
        All other PATCH requests delegate to the standard DRF implementation.
        """
        if request.data.get("clear_image"):
            instance = self.get_object()
            if instance.uploaded_image:
                instance.uploaded_image.delete(save=False)
            instance.uploaded_image = None
            instance.save(update_fields=["uploaded_image"])
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"detail": "Log deleted successfully."}, status=status.HTTP_200_OK)


# ── Public share endpoint ────────────────────────────────────────────────────

class ShareLogView(APIView):
    """
    GET /api/progress/share/log/<pk>/
    Public read-only view of a completed summit log.
    No authentication required — safe to share the URL.
    Only completed logs are shareable.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            log = UserMountainLog.objects.select_related(
                "mountain",
                "mountain__region",
                "mountain__collection",
            ).get(pk=pk, status="completed")
        except UserMountainLog.DoesNotExist:
            return Response(
                {"detail": "Log not found or not shareable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ShareLogSerializer(log, context={"request": request})
        return Response(serializer.data)


# ── CSV bulk import ──────────────────────────────────────────────────────────

class CsvImportView(APIView):
    """
    POST /api/progress/import/
    Accepts a multipart/form-data CSV file and bulk-creates UserMountainLog entries.

    Required CSV columns (flexible casing/aliases):
        Mountain | mountain | Name | name
        Date | date | Completed Date | completed_date

    Optional columns:
        Status | status
        Season | season
        Notes | notes
        Distance (km) | distance_km | hike_distance_km
        Duration (hrs) | duration_hrs | hike_duration_hours
        Steps | steps

    Returns:
        { imported: N, skipped: [{row, name?, reason}], total_rows: N }
    """
    permission_classes = [permissions.IsAuthenticated]

    STATUS_MAP = {
        "completed":   "completed",
        "planned":     "planned",
        "not started": "not_started",
        "not_started": "not_started",
        "":            "completed",
    }

    SEASON_MAP = {
        "summer": "summer",
        "winter": "winter",
        "spring": "spring",
        "autumn": "autumn",
        "fall":   "autumn",
    }

    DATE_FORMATS = [
        "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y",
        "%m/%d/%Y", "%d %b %Y", "%d %B %Y",
    ]

    def _get(self, row, *keys):
        for key in keys:
            val = (row.get(key) or "").strip()
            if val:
                return val
        return ""

    def _parse_date(self, date_str):
        for fmt in self.DATE_FORMATS:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None

    def post(self, request):
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response(
                {"detail": "No file provided. Send a CSV as multipart field 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = csv_file.read().decode("utf-8-sig")
            reader  = csv.DictReader(io.StringIO(decoded))
            rows    = list(reader)
        except Exception as exc:
            return Response(
                {"detail": f"Could not parse file: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mountain_lookup = {m.name.lower(): m for m in Mountain.objects.all()}

        imported = 0
        skipped  = []

        for i, row in enumerate(rows, start=2):
            name = self._get(row, "Mountain", "mountain", "Name", "name")
            if not name:
                skipped.append({"row": i, "reason": "No mountain name"})
                continue

            mountain = mountain_lookup.get(name.lower())
            if not mountain:
                matches = [m for n, m in mountain_lookup.items()
                           if name.lower() in n or n in name.lower()]
                if len(matches) == 1:
                    mountain = matches[0]
                else:
                    reason = (
                        f"'{name}' not found" if not matches
                        else f"'{name}' ambiguous ({len(matches)} matches)"
                    )
                    skipped.append({"row": i, "name": name, "reason": reason})
                    continue

            date_str       = self._get(row, "Completed Date", "completed_date", "Date", "date")
            completed_date = self._parse_date(date_str) if date_str else None
            if date_str and not completed_date:
                skipped.append({"row": i, "name": name, "reason": f"Could not parse date '{date_str}'"})
                continue

            status_str = self._get(row, "Status", "status").lower()
            log_status = self.STATUS_MAP.get(status_str, "completed")

            season_str = self._get(row, "Season", "season").lower()
            season     = self.SEASON_MAP.get(season_str, "")

            def _float(*keys):
                val = self._get(row, *keys)
                try:
                    return float(val) if val else None
                except ValueError:
                    return None

            def _int(*keys):
                val = self._get(row, *keys)
                try:
                    return int(val) if val else None
                except ValueError:
                    return None

            distance = _float("Distance (km)", "distance_km", "hike_distance_km")
            duration = _float("Duration (hrs)", "duration_hrs", "hike_duration_hours")
            steps    = _int("Steps", "steps")
            notes    = self._get(row, "Notes", "notes")

            if UserMountainLog.objects.filter(
                user=request.user,
                mountain=mountain,
                completed_date=completed_date,
                status=log_status,
            ).exists():
                skipped.append({
                    "row": i, "name": name,
                    "reason": "Duplicate — log already exists for this mountain, date and status",
                })
                continue

            UserMountainLog.objects.create(
                user=request.user,
                mountain=mountain,
                status=log_status,
                completed_date=completed_date,
                notes=notes,
                season=season,
                hike_distance_km=distance,
                hike_duration_hours=duration,
                steps=steps,
            )
            imported += 1

        return Response({
            "imported":   imported,
            "skipped":    skipped,
            "total_rows": imported + len(skipped),
        }, status=status.HTTP_200_OK)


# ── Collection notes ─────────────────────────────────────────────────────────

class UserCollectionNoteListCreateView(APIView):
    """
    GET  /api/progress/collection-notes/?collection=<id>
    POST /api/progress/collection-notes/  — creates or upserts by collection_id_ref
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserCollectionNote.objects.filter(user=request.user)
        collection_id = request.query_params.get("collection")
        if collection_id:
            qs = qs.filter(collection_id_ref=collection_id)
        return Response(UserCollectionNoteSerializer(qs, many=True).data)

    def post(self, request):
        collection_id = request.data.get("collection_id_ref")
        if collection_id:
            existing = UserCollectionNote.objects.filter(
                user=request.user, collection_id_ref=collection_id
            ).first()
            if existing:
                serializer = UserCollectionNoteSerializer(existing, data=request.data, partial=True)
                if not serializer.is_valid():
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                serializer.save()
                return Response(serializer.data)

        serializer = UserCollectionNoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserCollectionNoteDetailView(APIView):
    """
    GET    /api/progress/collection-notes/<pk>/
    PATCH  /api/progress/collection-notes/<pk>/
    DELETE /api/progress/collection-notes/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_note(self, pk):
        try:
            return UserCollectionNote.objects.get(pk=pk, user=self.request.user)
        except UserCollectionNote.DoesNotExist:
            return None

    def get(self, request, pk):
        note = self._get_note(pk)
        if not note:
            return Response({"detail": "Note not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserCollectionNoteSerializer(note).data)

    def patch(self, request, pk):
        note = self._get_note(pk)
        if not note:
            return Response({"detail": "Note not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserCollectionNoteSerializer(note, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        note = self._get_note(pk)
        if not note:
            return Response({"detail": "Note not found."}, status=status.HTTP_404_NOT_FOUND)
        note.delete()
        return Response({"detail": "Note deleted."}, status=status.HTTP_200_OK)


# ── Route log CRUD ───────────────────────────────────────────────────────────

class RouteLogCreateView(APIView):
    """POST /api/progress/routes/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RouteLogSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        route_log, created_logs = serializer.save()
        response_data = RouteLogResponseSerializer(route_log).data
        verb = "planned" if route_log.status == "planned" else "logged"
        response_data["message"] = (
            f"Route '{route_log.name}' {verb} — {len(created_logs)} summits added."
        )
        return Response(response_data, status=status.HTTP_201_CREATED)


class RouteLogDetailView(APIView):
    """
    GET    /api/progress/routes/<pk>/
    PATCH  /api/progress/routes/<pk>/
    DELETE /api/progress/routes/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_route(self, pk):
        try:
            return RouteLog.objects.prefetch_related(
                "mountain_logs",
                "mountain_logs__mountain",
                "mountain_logs__mountain__region",
            ).get(pk=pk, user=self.request.user)
        except RouteLog.DoesNotExist:
            return None

    def get(self, request, pk):
        route = self._get_route(pk)
        if not route:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)

        primary_log = route.mountain_logs.filter(is_route_primary=True).first()
        mountains = [
            {
                "id":         log.mountain.id,
                "name":       log.mountain.name,
                "slug":       log.mountain.slug,
                "height_m":   log.mountain.height_m,
                "region":     {"name": log.mountain.region.name} if log.mountain.region else None,
                "is_primary": log.is_route_primary,
            }
            for log in route.mountain_logs.select_related(
                "mountain", "mountain__region"
            ).order_by("-is_route_primary", "mountain__name")
        ]

        return Response({
            "id":                  route.id,
            "name":                route.name,
            "description":         route.description,
            "status":              route.status,
            "completed_date":      route.completed_date,
            "mountains":           mountains,
            "mountains_count":     len(mountains),
            "primary_mountain_id": primary_log.mountain_id        if primary_log else None,
            "season":              primary_log.season              if primary_log else "",
            "route_taken":         primary_log.route_taken         if primary_log else "",
            "hike_distance_km":    primary_log.hike_distance_km    if primary_log else None,
            "hike_duration_hours": primary_log.hike_duration_hours if primary_log else None,
            "steps":               primary_log.steps               if primary_log else None,
            "flights_climbed":     primary_log.flights_climbed     if primary_log else None,
            "notes":               primary_log.notes               if primary_log else "",
        })

    def patch(self, request, pk):
        route = self._get_route(pk)
        if not route:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)

        if "name" in request.data and request.data["name"].strip():
            route.name = request.data["name"].strip()
        if "description" in request.data:
            route.description = request.data["description"]
        if "status" in request.data and request.data["status"] in ("planned", "completed"):
            old_status = route.status
            route.status = request.data["status"]
            if old_status != route.status:
                new_log_status = "completed" if route.status == "completed" else "planned"
                route.mountain_logs.all().update(status=new_log_status)
        if "completed_date" in request.data:
            route.completed_date = request.data["completed_date"] or None
            route.mountain_logs.all().update(completed_date=route.completed_date)
        route.save()

        primary_log = route.mountain_logs.filter(is_route_primary=True).first()
        if primary_log:
            for field in ["route_taken", "notes", "season"]:
                if field in request.data:
                    setattr(primary_log, field, request.data[field] or "")
            for field in ["hike_distance_km", "hike_duration_hours", "steps", "flights_climbed"]:
                if field in request.data:
                    val = request.data[field]
                    setattr(primary_log, field, val if val not in ("", None) else None)
            primary_log.save()

        return Response({"detail": f"Route '{route.name}' updated successfully.", "id": route.id})

    def delete(self, request, pk):
        route = self._get_route(pk)
        if not route:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)

        route_name = route.name
        log_count  = route.mountain_logs.count()
        route.mountain_logs.all().delete()
        route.delete()

        return Response(
            {"detail": f"Route '{route_name}' and {log_count} summit logs deleted."},
            status=status.HTTP_200_OK,
        )


class UserRouteLogListView(generics.ListAPIView):
    """GET /api/progress/routes/list/"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RouteLog.objects.filter(user=self.request.user).prefetch_related(
            "mountain_logs", "mountain_logs__mountain", "mountain_logs__mountain__region",
        )

    def list(self, request, *args, **kwargs):
        status_filter = request.query_params.get("status")
        queryset = self.get_queryset()
        if status_filter in ("planned", "completed"):
            queryset = queryset.filter(status=status_filter)

        data = []
        for route in queryset:
            mountains = [
                {
                    "id":         log.mountain.id,
                    "name":       log.mountain.name,
                    "slug":       log.mountain.slug,
                    "height_m":   log.mountain.height_m,
                    "is_primary": log.is_route_primary,
                }
                for log in route.mountain_logs.select_related("mountain").order_by(
                    "-is_route_primary", "mountain__name"
                )
            ]
            data.append({
                "id":              route.id,
                "name":            route.name,
                "description":     route.description,
                "status":          route.status,
                "completed_date":  route.completed_date,
                "mountains":       mountains,
                "mountains_count": len(mountains),
                "created_at":      route.created_at,
            })
        return Response(data)


# ── Export ───────────────────────────────────────────────────────────────────

@method_decorator(login_required, name="dispatch")
class ExportLogsView(View):

    def get(self, request):
        export_format = request.GET.get("format", "csv").lower()
        logs = UserMountainLog.objects.filter(
            user=request.user, status="completed",
        ).select_related(
            "mountain", "mountain__region", "mountain__collection", "route_group",
        ).order_by("-completed_date")

        if export_format == "gpx":
            return self._export_gpx(logs)
        return self._export_csv(logs)

    def _export_csv(self, logs):
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Mountain", "Region", "Collection", "Height (m)", "Height (ft)",
            "Completed Date", "Season", "Route Name", "Route Taken",
            "Distance (km)", "Duration (hrs)", "Steps", "Flights Climbed",
            "Notes", "Latitude", "Longitude",
        ])
        for log in logs:
            m = log.mountain
            writer.writerow([
                m.name,
                m.region.name if m.region else "",
                m.collection.name if m.collection else "",
                m.height_m or "", m.height_ft or "",
                log.completed_date or "", log.season or "",
                log.route_group.name if log.route_group else "",
                log.route_taken or "",
                log.hike_distance_km or "", log.hike_duration_hours or "",
                log.steps or "", log.flights_climbed or "",
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
                latitude=float(lat), longitude=float(lon),
                elevation=float(m.height_m) if m.height_m else None,
                name=m.name,
                description=(
                    f"{m.region.name if m.region else ''} — "
                    f"{log.completed_date or 'No date'} — "
                    f"{log.route_taken or 'No route'}{route_context}"
                ),
            )
            gpx.waypoints.append(waypoint)

        response = HttpResponse(gpx.to_xml(), content_type="application/gpx+xml")
        response["Content-Disposition"] = 'attachment; filename="summitlog-completed.gpx"'
        return response