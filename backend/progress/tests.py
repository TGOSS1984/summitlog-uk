"""
Tests for the progress app.

Covers:
- UserMountainLog list / create (GET, POST)
- UserMountainLog detail (GET, PATCH, DELETE)
- Auth scoping — users can only see/modify their own logs
- Serializer validation (date, distance, duration, steps)
- ExportLogsView — CSV and GPX responses
- __str__ representation of the model
"""

import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from mountains.models import MountainCollection, Mountain, Region
from progress.models import UserMountainLog
from progress.serializers import UserMountainLogSerializer

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_region(name="Lake District"):
    return Region.objects.get_or_create(
        name=name,
        defaults={"slug": name.lower().replace(" ", "-"), "description": ""},
    )[0]


def make_collection(name="Wainwrights"):
    return MountainCollection.objects.get_or_create(
        name=name,
        defaults={"slug": name.lower(), "description": "", "expected_total": 214},
    )[0]


def make_mountain(name="Scafell Pike", height_m=978):
    region = make_region()
    collection = make_collection()          # <-- add this
    return Mountain.objects.get_or_create(
        name=name,
        defaults={
            "slug": name.lower().replace(" ", "-"),
            "height_m": height_m,
            "region": region,
            "collection": collection,       # <-- add this
            "summary": f"{name} summary",
            "latitude": 54.454,
            "longitude": -3.211,
        },
    )[0]


def make_user(username="testuser", password="testpass123"):
    return User.objects.create_user(username=username, password=password)


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class UserMountainLogModelTest(TestCase):

    def setUp(self):
        self.user = make_user()
        self.mountain = make_mountain()

    def test_str_with_date(self):
        log = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="completed",
            completed_date=datetime.date(2024, 8, 14),
        )
        self.assertIn("testuser", str(log))
        self.assertIn("Scafell Pike", str(log))
        self.assertIn("2024-08-14", str(log))

    def test_str_without_date(self):
        log = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="planned",
        )
        self.assertIn("no date", str(log))

    def test_default_status_is_not_started(self):
        log = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
        )
        self.assertEqual(log.status, "not_started")

    def test_ordering_by_completed_date_desc(self):
        log1 = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="completed",
            completed_date=datetime.date(2024, 1, 1),
        )
        mountain2 = make_mountain(name="Helvellyn", height_m=950)
        log2 = UserMountainLog.objects.create(
            user=self.user,
            mountain=mountain2,
            status="completed",
            completed_date=datetime.date(2024, 6, 1),
        )
        logs = list(UserMountainLog.objects.filter(user=self.user))
        self.assertEqual(logs[0], log2)  # most recent first

    def test_cascade_delete_with_user(self):
        log = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="completed",
        )
        log_id = log.id
        self.user.delete()
        self.assertFalse(UserMountainLog.objects.filter(id=log_id).exists())

    def test_multiple_ascents_same_mountain(self):
        """A user can have multiple logs for the same mountain."""
        UserMountainLog.objects.create(
            user=self.user, mountain=self.mountain, status="completed",
            completed_date=datetime.date(2023, 7, 1),
        )
        UserMountainLog.objects.create(
            user=self.user, mountain=self.mountain, status="completed",
            completed_date=datetime.date(2024, 8, 1),
        )
        self.assertEqual(
            UserMountainLog.objects.filter(user=self.user, mountain=self.mountain).count(),
            2,
        )


# ---------------------------------------------------------------------------
# Serializer validation tests
# ---------------------------------------------------------------------------

class UserMountainLogSerializerValidationTest(TestCase):

    def setUp(self):
        self.user = make_user()
        self.mountain = make_mountain()

    def _make_data(self, overrides=None):
        data = {
            "mountain": self.mountain.id,
            "status": "completed",
            "completed_date": "2024-06-01",
        }
        if overrides:
            data.update(overrides)
        return data

    def test_valid_data_passes(self):
        s = UserMountainLogSerializer(data=self._make_data())
        self.assertTrue(s.is_valid(), s.errors)

    def test_future_completed_date_is_rejected(self):
        future = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
        s = UserMountainLogSerializer(data=self._make_data({"completed_date": future}))
        self.assertFalse(s.is_valid())
        self.assertIn("completed_date", s.errors)

    def test_negative_distance_is_rejected(self):
        s = UserMountainLogSerializer(data=self._make_data({"hike_distance_km": "-1.0"}))
        self.assertFalse(s.is_valid())
        self.assertIn("hike_distance_km", s.errors)

    def test_negative_duration_is_rejected(self):
        s = UserMountainLogSerializer(data=self._make_data({"hike_duration_hours": "-2.5"}))
        self.assertFalse(s.is_valid())
        self.assertIn("hike_duration_hours", s.errors)

    def test_zero_distance_is_allowed(self):
        s = UserMountainLogSerializer(data=self._make_data({"hike_distance_km": "0.0"}))
        self.assertTrue(s.is_valid(), s.errors)

    def test_valid_season_choices(self):
        for season in ["summer", "winter", "spring", "autumn"]:
            s = UserMountainLogSerializer(data=self._make_data({"season": season}))
            self.assertTrue(s.is_valid(), f"{season} should be valid: {s.errors}")

    def test_invalid_season_is_rejected(self):
        s = UserMountainLogSerializer(data=self._make_data({"season": "monsoon"}))
        self.assertFalse(s.is_valid())
        self.assertIn("season", s.errors)

    def test_today_date_is_allowed(self):
        today = datetime.date.today().isoformat()
        s = UserMountainLogSerializer(data=self._make_data({"completed_date": today}))
        self.assertTrue(s.is_valid(), s.errors)


# ---------------------------------------------------------------------------
# API: Log list / create
# ---------------------------------------------------------------------------

class LogListCreateAPITest(APITestCase):

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.other_user = make_user("bob", "pass1234!")
        self.mountain = make_mountain()
        self.url = "/api/progress/logs/"

    def test_unauthenticated_returns_403(self):
        response = self.client.get(self.url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_authenticated_user_sees_only_own_logs(self):
        # Alice's log
        UserMountainLog.objects.create(user=self.user, mountain=self.mountain, status="completed")
        # Bob's log
        UserMountainLog.objects.create(user=self.other_user, mountain=self.mountain, status="planned")

        self.client.force_login(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        logs = data if isinstance(data, list) else data.get("results", [])
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["status"], "completed")

    def test_create_log_sets_user_automatically(self):
        self.client.force_login(self.user)
        payload = {
            "mountain": self.mountain.id,
            "status": "planned",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = UserMountainLog.objects.get(id=response.json()["id"])
        self.assertEqual(log.user, self.user)

    def test_create_log_unauthenticated_returns_403(self):
        payload = {"mountain": self.mountain.id, "status": "planned"}
        response = self.client.post(self.url, payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_create_log_with_all_fields(self):
        self.client.force_login(self.user)
        payload = {
            "mountain": self.mountain.id,
            "status": "completed",
            "season": "summer",
            "completed_date": "2024-07-15",
            "route_taken": "Corridor Route",
            "hike_distance_km": "12.4",
            "hike_duration_hours": "6.5",
            "steps": 24000,
            "flights_climbed": 72,
            "notes": "Brilliant day.",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["route_taken"], "Corridor Route")
        self.assertEqual(data["steps"], 24000)

    def test_create_log_with_future_date_fails(self):
        self.client.force_login(self.user)
        future = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        payload = {
            "mountain": self.mountain.id,
            "status": "completed",
            "completed_date": future,
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("completed_date", response.json())

    def test_response_includes_mountain_detail(self):
        self.client.force_login(self.user)
        UserMountainLog.objects.create(user=self.user, mountain=self.mountain, status="planned")
        response = self.client.get(self.url)
        logs = response.json()
        if isinstance(logs, dict):
            logs = logs.get("results", [])
        self.assertIn("mountain_detail", logs[0])
        self.assertEqual(logs[0]["mountain_detail"]["name"], self.mountain.name)


# ---------------------------------------------------------------------------
# API: Log detail (retrieve / update / delete)
# ---------------------------------------------------------------------------

class LogDetailAPITest(APITestCase):

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.other_user = make_user("bob", "pass1234!")
        self.mountain = make_mountain()
        self.log = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="planned",
        )
        self.url = f"/api/progress/logs/{self.log.id}/"

    def test_owner_can_retrieve_log(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], self.log.id)

    def test_other_user_cannot_retrieve_log(self):
        self.client.force_login(self.other_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_update_log(self):
        self.client.force_login(self.user)
        payload = {
            "mountain": self.mountain.id,
            "status": "completed",
            "completed_date": "2024-08-01",
        }
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, "completed")

    def test_other_user_cannot_update_log(self):
        self.client.force_login(self.other_user)
        payload = {"status": "completed"}
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_delete_log(self):
        self.client.force_login(self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(UserMountainLog.objects.filter(id=self.log.id).exists())

    def test_other_user_cannot_delete_log(self):
        self.client.force_login(self.other_user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(UserMountainLog.objects.filter(id=self.log.id).exists())

    def test_unauthenticated_cannot_delete_log(self):
        response = self.client.delete(self.url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_delete_returns_detail_message(self):
        self.client.force_login(self.user)
        response = self.client.delete(self.url)
        self.assertIn("detail", response.json())


# ---------------------------------------------------------------------------
# API: Export (CSV and GPX)
# ---------------------------------------------------------------------------

class ExportLogsViewTest(APITestCase):

    def setUp(self):
        self.user = make_user("exporter", "pass1234!")
        self.mountain = make_mountain()
        self.url = "/api/progress/export/"

    def _create_completed_log(self):
        return UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="completed",
            completed_date=datetime.date(2024, 6, 15),
            route_taken="Standard Route",
            hike_distance_km=10.5,
            hike_duration_hours=5.0,
            notes="Great day.",
        )

    def test_unauthenticated_export_redirects_or_403(self):
        response = self.client.get(self.url)
        # login_required redirects to /accounts/login/ (302) or returns 403
        self.assertIn(response.status_code, [
            status.HTTP_302_FOUND,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_401_UNAUTHORIZED,
        ])

    def test_csv_export_returns_correct_content_type(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])

    def test_csv_export_contains_mountain_name(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        content = response.content.decode("utf-8")
        self.assertIn("Scafell Pike", content)

    def test_csv_export_contains_headers(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        content = response.content.decode("utf-8")
        self.assertIn("Mountain", content)
        self.assertIn("Height (m)", content)
        self.assertIn("Completed Date", content)

    def test_csv_export_only_includes_completed_logs(self):
        self._create_completed_log()
        # Add a planned log — should not appear in export
        UserMountainLog.objects.create(
            user=self.user,
            mountain=make_mountain("Helvellyn", 950),
            status="planned",
        )
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        content = response.content.decode("utf-8")
        # Count data rows (excluding header)
        rows = [r for r in content.strip().split("\n") if r]
        self.assertEqual(len(rows), 2)  # header + 1 completed log

    def test_csv_export_empty_for_user_with_no_completed_logs(self):
        UserMountainLog.objects.create(
            user=self.user,
            mountain=self.mountain,
            status="planned",
        )
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode("utf-8")
        rows = [r for r in content.strip().split("\n") if r]
        self.assertEqual(len(rows), 1)  # header only

    def test_csv_export_only_includes_own_logs(self):
        self._create_completed_log()
        other_user = make_user("other", "pass1234!")
        UserMountainLog.objects.create(
            user=other_user,
            mountain=make_mountain("Ben Nevis", 1345),
            status="completed",
            completed_date=datetime.date(2024, 5, 1),
        )
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        content = response.content.decode("utf-8")
        self.assertNotIn("Ben Nevis", content)

    def test_csv_export_has_content_disposition_header(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "csv"})
        self.assertIn("attachment", response.get("Content-Disposition", ""))
        self.assertIn(".csv", response.get("Content-Disposition", ""))

    def test_gpx_export_returns_correct_content_type(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "gpx"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("gpx", response["Content-Type"])

    def test_gpx_export_contains_mountain_name(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url, {"format": "gpx"})
        content = response.content.decode("utf-8")
        self.assertIn("Scafell Pike", content)

    def test_default_format_is_csv(self):
        self._create_completed_log()
        self.client.force_login(self.user)
        response = self.client.get(self.url)  # no format param
        self.assertIn("text/csv", response["Content-Type"])
