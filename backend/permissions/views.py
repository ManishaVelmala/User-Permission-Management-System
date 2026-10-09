from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from .models import Function
from .permissions import HasAssignPermission
from .serializers import FunctionSerializer, PermissionCodesSerializer


ALL_PERMISSION_CODES = [
    'CREATE_EMPLOYEE',
    'EDIT_EMPLOYEE',
    'DELETE_EMPLOYEE',
    'VIEW_EMPLOYEE',
    'VIEW_SELF',
    'ASSIGN_PERMISSION',
]


class UsersListView(APIView):
    """
    GET /api/users/
        Returns a list of all users with their assigned permissions.
        Requires authenticated user with ASSIGN_PERMISSION function.
    """
    permission_classes = [IsAuthenticated, HasAssignPermission]

    def get(self, request):
        users = User.objects.all().prefetch_related('functions').order_by('email')
        data = []
        for u in users:
            data.append({
                'id': u.id,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_active': u.is_active,
                'permissions': list(u.functions.values_list('code', flat=True).order_by('code')),
            })
        return Response(data, status=status.HTTP_200_OK)


class UserPermissionsView(APIView):
    """
    GET /api/users/{user_id}/permissions/
        View a user's assigned permissions.
    POST /api/users/{user_id}/permissions/
        Add permissions to a user.
    PUT /api/users/{user_id}/permissions/
        Set a user's permissions exactly (replaces all existing permissions).
    DELETE /api/users/{user_id}/permissions/
        Remove permissions from a user.

    Requires authenticated user with ASSIGN_PERMISSION function.
    """
    permission_classes = [IsAuthenticated, HasAssignPermission]

    def get_target_user(self, user_id):
        return get_object_or_404(User, id=user_id)

    def get(self, request, user_id):
        target_user = self.get_target_user(user_id)
        serializer = FunctionSerializer(target_user.functions.all().order_by('code'), many=True)
        return Response({
            'user_id': target_user.id,
            'email': target_user.email,
            'permissions': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, user_id):
        target_user = self.get_target_user(user_id)
        serializer = PermissionCodesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        functions_to_add = serializer.validated_data['function_codes']
        target_user.functions.add(*functions_to_add)

        updated_serializer = FunctionSerializer(target_user.functions.all().order_by('code'), many=True)
        return Response({
            'message': 'Permissions added successfully.',
            'user_id': target_user.id,
            'email': target_user.email,
            'permissions': updated_serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        """
        Replace the user's entire permission set.
        Accepts { "function_codes": ["CODE1", "CODE2", ...] }
        or { "function_codes": [] } to clear all permissions.
        """
        target_user = self.get_target_user(user_id)

        # Allow empty list to clear all permissions
        raw_codes = request.data.get('function_codes', [])
        if not isinstance(raw_codes, list):
            return Response(
                {'function_codes': ['Must be a list.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(raw_codes) == 0:
            # Clear all permissions
            target_user.functions.clear()
        else:
            serializer = PermissionCodesSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            functions_to_set = serializer.validated_data['function_codes']
            target_user.functions.set(functions_to_set)

        updated_serializer = FunctionSerializer(target_user.functions.all().order_by('code'), many=True)
        return Response({
            'message': 'Permissions updated successfully.',
            'user_id': target_user.id,
            'email': target_user.email,
            'permissions': updated_serializer.data
        }, status=status.HTTP_200_OK)

    def delete(self, request, user_id):
        target_user = self.get_target_user(user_id)
        serializer = PermissionCodesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        functions_to_remove = serializer.validated_data['function_codes']
        target_user.functions.remove(*functions_to_remove)

        updated_serializer = FunctionSerializer(target_user.functions.all().order_by('code'), many=True)
        return Response({
            'message': 'Permissions removed successfully.',
            'user_id': target_user.id,
            'email': target_user.email,
            'permissions': updated_serializer.data
        }, status=status.HTTP_200_OK)


class AllFunctionsView(APIView):
    """
    GET /api/permissions/functions/
        Returns all available permission functions in the system.
        Requires ASSIGN_PERMISSION.
    """
    permission_classes = [IsAuthenticated, HasAssignPermission]

    def get(self, request):
        functions = Function.objects.all().order_by('code')
        serializer = FunctionSerializer(functions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
