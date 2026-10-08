from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Employee
from .serializers import EmployeeSerializer
from permissions.permissions import HasRequiredFunction


class EmployeePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmployeeListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/employees/ -> Requires VIEW_EMPLOYEE (paginated)
    POST /api/employees/ -> Requires CREATE_EMPLOYEE
    """
    queryset = Employee.objects.all().order_by('last_name', 'first_name')
    serializer_class = EmployeeSerializer
    pagination_class = EmployeePagination
    permission_classes = [IsAuthenticated, HasRequiredFunction]
    required_functions = {
        'GET': 'VIEW_EMPLOYEE',
        'POST': 'CREATE_EMPLOYEE',
    }


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/employees/{id}/ -> Requires VIEW_EMPLOYEE
    PUT    /api/employees/{id}/ -> Requires EDIT_EMPLOYEE
    PATCH  /api/employees/{id}/ -> Requires EDIT_EMPLOYEE
    DELETE /api/employees/{id}/ -> Requires DELETE_EMPLOYEE
    """
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, HasRequiredFunction]
    required_functions = {
        'GET': 'VIEW_EMPLOYEE',
        'PUT': 'EDIT_EMPLOYEE',
        'PATCH': 'EDIT_EMPLOYEE',
        'DELETE': 'DELETE_EMPLOYEE',
    }


class EmployeeMeView(APIView):
    """
    GET /api/employees/me/ -> Requires VIEW_SELF
    Returns exclusively the logged-in user's employee record.
    """
    permission_classes = [IsAuthenticated, HasRequiredFunction]
    required_function = 'VIEW_SELF'

    def get(self, request):
        employee = Employee.objects.filter(user=request.user).first()
        if not employee:
            return Response(
                {"detail": "No employee profile found for the current user."},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data, status=status.HTTP_200_OK)
