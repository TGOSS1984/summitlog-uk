"""
Tests for the accounts app.

Covers:
- CSRF token endpoint
- User registration (valid, duplicate username, short password)
- Login (valid, wrong password, nonexistent user)
- Logout
- CurrentUserView (authenticated and unauthenticated)
- UpdateProfileView (bio, username, email)
- UserProfile model and auto-creation
- UserSerializer avatar/bio fields
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from accounts.serializers import RegisterSerializer, UserSerializer

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(username="testuser", password="strongpass123", email="test@example.com"):
    user = User.objects.create_user(username=username, password=password, email=email)
    UserProfile.objects.get_or_create(user=user)
    return user


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class UserProfileModelTest(TestCase):

    def test_str_representation(self):
        user = make_user()
        profile = user.profile
        self.assertIn("testuser", str(profile))
        self.assertIn("profile", str(profile))

    def test_profile_created_via_register_serializer(self):
        s = RegisterSerializer(data={
            "username": "newuser",
            "email": "new@example.com",
            "password": "strongpass123",
        })
        self.assertTrue(s.is_valid(), s.errors)
        user = s.save()
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_profile_bio_defaults_to_empty(self):
        user = make_user(username="biless")
        self.assertEqual(user.profile.bio, "")

    def test_profile_avatar_defaults_to_none(self):
        user = make_user(username="noavatar")
        self.assertFalse(bool(user.profile.avatar))


# ---------------------------------------------------------------------------
# Serializer tests
# ---------------------------------------------------------------------------

class RegisterSerializerTest(TestCase):

    def test_valid_registration(self):
        s = RegisterSerializer(data={
            "username": "alice",
            "email": "alice@example.com",
            "password": "securepass99",
        })
        self.assertTrue(s.is_valid(), s.errors)

    def test_password_too_short(self):
        s = RegisterSerializer(data={
            "username": "alice",
            "email": "alice@example.com",
            "password": "short",
        })
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_email_is_optional(self):
        s = RegisterSerializer(data={
            "username": "nomail",
            "password": "securepass99",
        })
        self.assertTrue(s.is_valid(), s.errors)

    def test_creates_user_with_hashed_password(self):
        s = RegisterSerializer(data={
            "username": "hashme",
            "password": "securepass99",
        })
        s.is_valid()
        user = s.save()
        self.assertNotEqual(user.password, "securepass99")
        self.assertTrue(user.check_password("securepass99"))


class UserSerializerTest(TestCase):

    def test_includes_avatar_and_bio_fields(self):
        user = make_user()
        s = UserSerializer(user)
        self.assertIn("avatar", s.data)
        self.assertIn("bio", s.data)

    def test_bio_returns_empty_string_when_no_profile(self):
        user = User.objects.create_user(username="noprofile", password="pass12345")
        # Deliberately no profile created
        s = UserSerializer(user)
        self.assertEqual(s.data["bio"], "")

    def test_avatar_returns_none_when_no_image(self):
        user = make_user(username="noimg")
        s = UserSerializer(user)
        self.assertIsNone(s.data["avatar"])


# ---------------------------------------------------------------------------
# API: CSRF
# ---------------------------------------------------------------------------

class CsrfTokenViewTest(APITestCase):

    def test_returns_csrf_token(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrfToken", response.json())

    def test_csrf_token_is_string(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertIsInstance(response.json()["csrfToken"], str)
        self.assertGreater(len(response.json()["csrfToken"]), 0)


# ---------------------------------------------------------------------------
# API: Register
# ---------------------------------------------------------------------------

class RegisterViewTest(APITestCase):

    url = "/api/auth/register/"

    def test_valid_registration_returns_201(self):
        response = self.client.post(self.url, {
            "username": "newuser",
            "email": "new@example.com",
            "password": "strongpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_registration_creates_user(self):
        self.client.post(self.url, {
            "username": "created",
            "password": "strongpass123",
        }, format="json")
        self.assertTrue(User.objects.filter(username="created").exists())

    def test_registration_creates_profile(self):
        self.client.post(self.url, {
            "username": "withprofile",
            "password": "strongpass123",
        }, format="json")
        user = User.objects.get(username="withprofile")
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_duplicate_username_returns_400(self):
        make_user(username="taken")
        response = self.client.post(self.url, {
            "username": "taken",
            "password": "strongpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_password_returns_400(self):
        response = self.client.post(self.url, {
            "username": "shortpw",
            "password": "abc",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_logged_in_returns_400(self):
        user = make_user()
        self.client.force_login(user)
        response = self.client.post(self.url, {
            "username": "another",
            "password": "strongpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_response_does_not_include_password(self):
        response = self.client.post(self.url, {
            "username": "nopwleak",
            "password": "strongpass123",
        }, format="json")
        self.assertNotIn("password", response.json())


# ---------------------------------------------------------------------------
# API: Login
# ---------------------------------------------------------------------------

class LoginViewTest(APITestCase):

    url = "/api/auth/login/"

    def setUp(self):
        self.user = make_user(username="loginuser", password="correctpass123")

    def test_valid_login_returns_200(self):
        response = self.client.post(self.url, {
            "username": "loginuser",
            "password": "correctpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_valid_login_returns_user_data(self):
        response = self.client.post(self.url, {
            "username": "loginuser",
            "password": "correctpass123",
        }, format="json")
        data = response.json()
        # View returns user object directly, not wrapped
        self.assertEqual(data["username"], "loginuser")

    def test_wrong_password_returns_400(self):
        response = self.client.post(self.url, {
            "username": "loginuser",
            "password": "wrongpassword",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_user_returns_400(self):
        response = self.client.post(self.url, {
            "username": "ghost",
            "password": "anypassword",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_username_returns_400(self):
        response = self.client.post(self.url, {
            "password": "correctpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_password_returns_400(self):
        response = self.client.post(self.url, {
            "username": "loginuser",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_logged_in_returns_400(self):
        self.client.force_login(self.user)
        response = self.client.post(self.url, {
            "username": "loginuser",
            "password": "correctpass123",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_sets_session(self):
        self.client.post(self.url, {
            "username": "loginuser",
            "password": "correctpass123",
        }, format="json")
        # After login, /api/auth/me/ should return the user
        me = self.client.get("/api/auth/me/")
        data = me.json()
        self.assertIsNotNone(data.get("user"))


# ---------------------------------------------------------------------------
# API: Logout
# ---------------------------------------------------------------------------

class LogoutViewTest(APITestCase):

    url = "/api/auth/logout/"

    def test_logout_returns_200(self):
        user = make_user()
        self.client.force_login(user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_clears_session(self):
        user = make_user()
        self.client.force_login(user)
        self.client.post(self.url)
        me = self.client.get("/api/auth/me/")
        data = me.json()
        self.assertIsNone(data.get("user"))

    def test_logout_unauthenticated_returns_403(self):
        """Logout endpoint requires authentication."""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# API: Current user
# ---------------------------------------------------------------------------

class CurrentUserViewTest(APITestCase):

    url = "/api/auth/me/"

    def test_authenticated_returns_user(self):
        user = make_user(username="meuser")
        self.client.force_login(user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["username"], "meuser")

    def test_unauthenticated_returns_null_user(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsNone(data.get("user"))

    def test_response_includes_email(self):
        user = make_user(username="emailuser", email="email@test.com")
        self.client.force_login(user)
        response = self.client.get(self.url)
        self.assertEqual(response.json()["user"]["email"], "email@test.com")

    def test_response_includes_bio(self):
        user = make_user(username="biouser")
        user.profile.bio = "I love hills."
        user.profile.save()
        self.client.force_login(user)
        response = self.client.get(self.url)
        self.assertEqual(response.json()["user"]["bio"], "I love hills.")


# ---------------------------------------------------------------------------
# API: Update profile
# ---------------------------------------------------------------------------

class UpdateProfileViewTest(APITestCase):

    url = "/api/auth/profile/"

    def setUp(self):
        self.user = make_user(username="profileuser", email="old@example.com")

    def test_unauthenticated_returns_403(self):
        response = self.client.patch(self.url, {"bio": "hello"}, format="json")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_update_bio(self):
        self.client.force_login(self.user)
        response = self.client.patch(self.url, {"bio": "Avid Wainwright bagger."}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.bio, "Avid Wainwright bagger.")

    def test_update_email(self):
        self.client.force_login(self.user)
        response = self.client.patch(self.url, {"email": "new@example.com"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "new@example.com")

    def test_update_username(self):
        self.client.force_login(self.user)
        response = self.client.patch(self.url, {"username": "updateduser"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "updateduser")

    def test_partial_update_does_not_clear_other_fields(self):
        self.user.profile.bio = "Original bio."
        self.user.profile.save()
        self.client.force_login(self.user)
        self.client.patch(self.url, {"email": "new@example.com"}, format="multipart")
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.bio, "Original bio.")
