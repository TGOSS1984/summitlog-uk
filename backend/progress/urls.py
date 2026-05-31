from django.urls import path

from .views import (
    ExportLogsView,
    RouteLogCreateView,
    RouteLogDetailView,
    UserMountainLogDetailView,
    UserMountainLogListCreateView,
    UserRouteLogListView,
)

urlpatterns = [
    path("logs/",              UserMountainLogListCreateView.as_view(), name="user-log-list"),
    path("logs/<int:pk>/",     UserMountainLogDetailView.as_view(),     name="user-log-detail"),
    path("export/",            ExportLogsView.as_view(),                name="export-logs"),
    path("routes/",            RouteLogCreateView.as_view(),            name="route-log-create"),
    path("routes/list/",       UserRouteLogListView.as_view(),          name="route-log-list"),
    path("routes/<int:pk>/",   RouteLogDetailView.as_view(),            name="route-log-detail"),
]