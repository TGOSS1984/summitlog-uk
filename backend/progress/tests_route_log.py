"""
Tests for the route log feature.

Covers:
- RouteLogCreateView  — POST /api/progress/routes/
- RouteLogDetailView  — GET / PATCH / DELETE /api/progress/routes/<pk>/
- UserRouteLogListView — GET /api/progress/routes/list/
- Auth scoping — users can only access their own routes
"""

import datetime

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from mountains.models import MountainCollection, Mountain, Region
from progress.models import RouteLog, UserMountainLog

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


def make_mountain(name="Fairfield", height_m=873):
    region = make_region()
    collection = make_collection()
    return Mountain.objects.get_or_create(
        name=name,
        defaults={
            "slug": name.lower().replace(" ", "-"),
            "height_m": height_m,
            "region": region,
            "collection": collection,
            "summary": f"{name} summary",
            "latitude": 54.5,
            "longitude": -2.9,
        },
    )[0]


def make_user(username="testuser", password="testpass123"):
    return User.objects.create_user(username=username, password=password)


def make_route_payload(mountain_ids, primary_id, **overrides):
    """Build a minimal valid route payload."""
    payload = {
        "name": "Fairfield Horseshoe",
        "description": "Classic Lake District round.",
        "completed_date": "2024-08-01",
        "season": "summer",
        "mountain_ids": mountain_ids,
        "primary_mountain_id": primary_id,
        "route_taken": "Rydal → Fairfield → Dove Crag → Ambleside",
        "hike_distance_km": "15.2",
        "hike_duration_hours": "7.5",
        "steps": 28000,
        "flights_climbed": 86,
        "notes": "Brilliant clear day.",
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# RouteLogCreateView
# ---------------------------------------------------------------------------

class RouteLogCreateViewTest(APITestCase):

    url = "/api/progress/routes/"

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.m1 = make_mountain("Fairfield", 873)
        self.m2 = make_mountain("Dove Crag", 792)
        self.m3 = make_mountain("Hart Crag", 822)

    def test_unauthenticated_returns_403(self):
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        response = self.client.post(self.url, payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_create_route_returns_201(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_creates_route_log_record(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        self.assertEqual(RouteLog.objects.filter(user=self.user).count(), 1)
        route = RouteLog.objects.get(user=self.user)
        self.assertEqual(route.name, "Fairfield Horseshoe")

    def test_creates_one_mountain_log_per_mountain(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id, self.m3.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)
        self.assertEqual(route.mountain_logs.count(), 3)

    def test_all_mountain_logs_marked_completed(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)
        statuses = list(route.mountain_logs.values_list("status", flat=True))
        self.assertTrue(all(s == "completed" for s in statuses))

    def test_stats_stored_on_primary_summit_only(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)

        primary = route.mountain_logs.get(mountain=self.m1)
        secondary = route.mountain_logs.get(mountain=self.m2)

        self.assertIsNotNone(primary.hike_distance_km)
        self.assertIsNotNone(primary.hike_duration_hours)
        self.assertIsNotNone(primary.steps)
        self.assertIsNone(secondary.hike_distance_km)
        self.assertIsNone(secondary.hike_duration_hours)
        self.assertIsNone(secondary.steps)

    def test_primary_flag_set_correctly(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)

        self.assertTrue(route.mountain_logs.get(mountain=self.m1).is_route_primary)
        self.assertFalse(route.mountain_logs.get(mountain=self.m2).is_route_primary)

    def test_all_logs_share_route_group_id_ref(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id, self.m3.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)
        uuids = set(route.mountain_logs.values_list("route_group_id_ref", flat=True))
        self.assertEqual(len(uuids), 1)  # all share one UUID

    def test_all_logs_linked_to_route_group(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)
        linked = route.mountain_logs.filter(route_group=route).count()
        self.assertEqual(linked, 2)

    def test_all_logs_get_correct_date(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post(self.url, payload, format="json")
        route = RouteLog.objects.get(user=self.user)
        dates = list(route.mountain_logs.values_list("completed_date", flat=True))
        self.assertTrue(all(str(d) == "2024-08-01" for d in dates))

    def test_response_contains_message(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        response = self.client.post(self.url, payload, format="json")
        self.assertIn("message", response.json())
        self.assertIn("Fairfield Horseshoe", response.json()["message"])

    def test_response_contains_mountains_count(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id, self.m3.id], self.m1.id)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.json()["mountains_count"], 3)

    def test_single_mountain_rejected(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id], self.m1.id)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_primary_not_in_list_rejected(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m3.id)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_date_rejected(self):
        self.client.force_login(self.user)
        future = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id, completed_date=future)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_name_rejected(self):
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id, name="")
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# RouteLogDetailView — GET
# ---------------------------------------------------------------------------

class RouteLogDetailGetTest(APITestCase):

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.other_user = make_user("bob", "pass1234!")
        self.m1 = make_mountain("Fairfield", 873)
        self.m2 = make_mountain("Dove Crag", 792)
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post("/api/progress/routes/", payload, format="json")
        self.route = RouteLog.objects.get(user=self.user)
        self.url = f"/api/progress/routes/{self.route.id}/"

    def test_owner_can_retrieve_route(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["name"], "Fairfield Horseshoe")

    def test_response_includes_mountains(self):
        response = self.client.get(self.url)
        self.assertIn("mountains", response.json())
        self.assertEqual(len(response.json()["mountains"]), 2)

    def test_response_includes_primary_stats(self):
        response = self.client.get(self.url)
        data = response.json()
        self.assertIn("hike_distance_km", data)
        self.assertIn("steps", data)
        self.assertIn("primary_mountain_id", data)

    def test_other_user_cannot_retrieve_route(self):
        self.client.force_login(self.other_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonexistent_route_returns_404(self):
        response = self.client.get("/api/progress/routes/99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# RouteLogDetailView — PATCH
# ---------------------------------------------------------------------------

class RouteLogDetailPatchTest(APITestCase):

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.other_user = make_user("bob", "pass1234!")
        self.m1 = make_mountain("Fairfield", 873)
        self.m2 = make_mountain("Dove Crag", 792)
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post("/api/progress/routes/", payload, format="json")
        self.route = RouteLog.objects.get(user=self.user)
        self.url = f"/api/progress/routes/{self.route.id}/"

    def test_owner_can_update_name(self):
        response = self.client.patch(self.url, {"name": "Updated Horseshoe"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.route.refresh_from_db()
        self.assertEqual(self.route.name, "Updated Horseshoe")

    def test_date_update_syncs_to_all_mountain_logs(self):
        self.client.patch(self.url, {"completed_date": "2024-09-15"}, format="json")
        dates = list(
            self.route.mountain_logs.values_list("completed_date", flat=True)
        )
        self.assertTrue(all(str(d) == "2024-09-15" for d in dates))

    def test_stats_update_on_primary_log(self):
        self.client.patch(self.url, {
            "hike_distance_km": "18.5",
            "steps": 32000,
            "notes": "Updated notes.",
        }, format="json")
        primary = self.route.mountain_logs.get(is_route_primary=True)
        primary.refresh_from_db()
        self.assertEqual(float(primary.hike_distance_km), 18.5)
        self.assertEqual(primary.steps, 32000)
        self.assertEqual(primary.notes, "Updated notes.")

    def test_other_user_cannot_update_route(self):
        self.client.force_login(self.other_user)
        response = self.client.patch(self.url, {"name": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.route.refresh_from_db()
        self.assertNotEqual(self.route.name, "Hacked")

    def test_empty_name_not_applied(self):
        self.client.patch(self.url, {"name": ""}, format="json")
        self.route.refresh_from_db()
        self.assertEqual(self.route.name, "Fairfield Horseshoe")


# ---------------------------------------------------------------------------
# RouteLogDetailView — DELETE
# ---------------------------------------------------------------------------

class RouteLogDetailDeleteTest(APITestCase):

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.other_user = make_user("bob", "pass1234!")
        self.m1 = make_mountain("Fairfield", 873)
        self.m2 = make_mountain("Dove Crag", 792)
        self.client.force_login(self.user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id)
        self.client.post("/api/progress/routes/", payload, format="json")
        self.route = RouteLog.objects.get(user=self.user)
        self.url = f"/api/progress/routes/{self.route.id}/"

    def test_owner_can_delete_route(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(RouteLog.objects.filter(id=self.route.id).exists())

    def test_delete_removes_all_linked_mountain_logs(self):
        log_ids = list(self.route.mountain_logs.values_list("id", flat=True))
        self.client.delete(self.url)
        for lid in log_ids:
            self.assertFalse(UserMountainLog.objects.filter(id=lid).exists())

    def test_delete_returns_detail_message(self):
        response = self.client.delete(self.url)
        self.assertIn("detail", response.json())
        self.assertIn("Fairfield Horseshoe", response.json()["detail"])

    def test_other_user_cannot_delete_route(self):
        self.client.force_login(self.other_user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(RouteLog.objects.filter(id=self.route.id).exists())

    def test_individual_logs_unaffected_by_route_delete(self):
        """A standalone log not part of this route should not be deleted."""
        standalone = UserMountainLog.objects.create(
            user=self.user,
            mountain=self.m1,
            status="completed",
            completed_date=datetime.date(2024, 1, 1),
        )
        self.client.delete(self.url)
        self.assertTrue(UserMountainLog.objects.filter(id=standalone.id).exists())


# ---------------------------------------------------------------------------
# UserRouteLogListView
# ---------------------------------------------------------------------------

class UserRouteLogListViewTest(APITestCase):

    url = "/api/progress/routes/list/"

    def setUp(self):
        self.user = make_user("alice", "pass1234!")
        self.other_user = make_user("bob", "pass1234!")
        self.m1 = make_mountain("Fairfield", 873)
        self.m2 = make_mountain("Dove Crag", 792)

    def _create_route(self, user, name="Test Route"):
        self.client.force_login(user)
        payload = make_route_payload([self.m1.id, self.m2.id], self.m1.id, name=name)
        self.client.post("/api/progress/routes/", payload, format="json")

    def test_returns_only_own_routes(self):
        self._create_route(self.user, "Alice Route")
        self._create_route(self.other_user, "Bob Route")
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [r["name"] for r in response.json()]
        self.assertIn("Alice Route", names)
        self.assertNotIn("Bob Route", names)

    def test_response_includes_mountains_list(self):
        self._create_route(self.user)
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertIn("mountains", response.json()[0])
        self.assertEqual(len(response.json()[0]["mountains"]), 2)

    def test_unauthenticated_returns_403(self):
        response = self.client.get(self.url)
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_empty_list_when_no_routes(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.json(), [])