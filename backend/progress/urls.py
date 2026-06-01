from django.urls import path

from .views import (
    CsvImportView,
    ExportLogsView,
    RouteLogCreateView,
    RouteLogDetailView,
    ShareLogView,
    UserCollectionNoteDetailView,
    UserCollectionNoteListCreateView,
    UserMountainLogDetailView,
    UserMountainLogListCreateView,
    UserRouteLogListView,
)

urlpatterns = [
    # Individual mountain logs
    path("logs/",          UserMountainLogListCreateView.as_view(), name="user-log-list"),
    path("logs/<int:pk>/", UserMountainLogDetailView.as_view(),     name="user-log-detail"),

    # Export
    path("export/", ExportLogsView.as_view(), name="export-logs"),

    # CSV bulk import
    path("import/", CsvImportView.as_view(), name="csv-import"),

    # Public share (no auth)
    path("share/log/<int:pk>/", ShareLogView.as_view(), name="share-log"),

    # Multi-mountain routes
    path("routes/",            RouteLogCreateView.as_view(),  name="route-log-create"),
    path("routes/list/",       UserRouteLogListView.as_view(), name="route-log-list"),
    path("routes/<int:pk>/",   RouteLogDetailView.as_view(),  name="route-log-detail"),

    # Collection notes
    path("collection-notes/",          UserCollectionNoteListCreateView.as_view(), name="collection-note-list"),
    path("collection-notes/<int:pk>/", UserCollectionNoteDetailView.as_view(),     name="collection-note-detail"),
]