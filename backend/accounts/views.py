from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import AuthenticationFailed
from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    """
    POST /api/login/
    Authenticates a user with email and password.
    Returns access, refresh JWT tokens and safe user information.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'detail': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LoginSerializer(data=request.data, context={'request': request})
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed as exc:
            return Response({'detail': str(exc.detail)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Requires valid JWT authentication.
    Returns safe user information for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
