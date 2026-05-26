from django.urls import path

from .views import ExportLogsView, UserMountainLogDetailView, UserMountainLogListCreateView


urlpatterns = [
    path("logs/", UserMountainLogListCreateView.as_view(), name="user-log-list"),
    path("logs/<int:pk>/", UserMountainLogDetailView.as_view(), name="user-log-detail"),
    path("export/", ExportLogsView.as_view(), name="export-logs"),
]