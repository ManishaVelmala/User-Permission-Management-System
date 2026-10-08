from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Safe serializer for User details. Never exposes passwords or password hashes."""
    permissions = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='code',
        source='functions'
    )

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'permissions')
        read_only_fields = ('id', 'email', 'first_name', 'last_name', 'permissions')


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip()
        password = attrs.get('password', '')

        if not email or not password:
            raise AuthenticationFailed('Email and password are required.')

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        if not user:
            # Also attempt email=email if custom backend expects it
            user = authenticate(
                request=self.context.get('request'),
                email=email,
                password=password
            )

        if not user:
            raise AuthenticationFailed('Invalid email or password.')

        if not user.is_active:
            raise AuthenticationFailed('User account is inactive.')

        refresh = RefreshToken.for_user(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }
