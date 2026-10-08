from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'first_name', 'last_name', 'department', 'job_title', 'user', 'is_active')
    list_filter = ('department', 'is_active')
    search_fields = ('employee_id', 'first_name', 'last_name', 'email', 'job_title')
    ordering = ('last_name', 'first_name')
