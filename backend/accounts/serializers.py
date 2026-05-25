from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["avatar", "bio"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        # Auto-create profile for new users
        UserProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "avatar",
            "bio",
        ]

    def get_avatar(self, obj):
        try:
            if obj.profile.avatar:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.profile.avatar.url)
                return obj.profile.avatar.url
        except UserProfile.DoesNotExist:
            pass
        return None

    def get_bio(self, obj):
        try:
            return obj.profile.bio
        except UserProfile.DoesNotExist:
            return ""


class UpdateProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", required=False)
    email = serializers.EmailField(source="user.email", required=False)

    class Meta:
        model = UserProfile
        fields = ["avatar", "bio", "username", "email"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        # Update user fields
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance