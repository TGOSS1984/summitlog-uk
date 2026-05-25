from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import RegisterSerializer, UpdateProfileSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            return Response(
                {"detail": "You are already logged in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)
            return Response(
                UserSerializer(user, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            return Response(
                {"detail": "You are already logged in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username = request.data.get("username")
        password = request.data.get("password")
        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(UserSerializer(user, context={"request": request}).data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(
            {"detail": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"user": None}, status=status.HTTP_200_OK)
        return Response(
            {"user": UserSerializer(request.user, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )


class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UpdateProfileSerializer(
            profile,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                UserSerializer(request.user, context={"request": request}).data
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CsrfTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {"csrfToken": get_token(request)},
            status=status.HTTP_200_OK,
        )