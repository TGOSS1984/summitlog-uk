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
    # Django's default User model does NOT enforce email uniqueness at the
    # DB level, so this needs an explicit check here. Case-insensitive so
    # "Tom@Example.com" and "tom@example.com" are treated as the same
    # account (mirrors how most auth providers behave).
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
        ]

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value

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
    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = ["avatar", "bio", "username", "email"]

    def validate_username(self, value):
        current_user = self.instance.user
        if User.objects.exclude(pk=current_user.pk).filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with that username already exists."
            )
        return value

    def validate_email(self, value):
        current_user = self.instance.user
        if value and User.objects.exclude(pk=current_user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value

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