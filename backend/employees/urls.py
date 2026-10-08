from django.urls import path
from .views import EmployeeListCreateView, EmployeeDetailView, EmployeeMeView

urlpatterns = [
    path('employees/', EmployeeListCreateView.as_view(), name='employee_list_create'),
    path('employees/me/', EmployeeMeView.as_view(), name='employee_me'),
    path('employees/<int:pk>/', EmployeeDetailView.as_view(), name='employee_detail'),
]
