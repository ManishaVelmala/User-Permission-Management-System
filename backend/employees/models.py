from django.db import models
from django.conf import settings
from django.utils import timezone


class Employee(models.Model):
    """
    Employee model representing an organization employee,
    linked to the custom User model.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employee_profile',
        null=True,
        blank=True,
        help_text="The user account linked to this employee"
    )
    first_name = models.CharField(max_length=150, help_text="Employee first name")
    last_name = models.CharField(max_length=150, help_text="Employee last name")
    email = models.EmailField(max_length=255, blank=True, default='', help_text="Employee contact email")
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique employee identifier (e.g. EMP-001)"
    )
    department = models.CharField(max_length=100, help_text="Department the employee belongs to")
    job_title = models.CharField(max_length=150, help_text="Job title or role")
    phone = models.CharField(max_length=30, blank=True, default='', help_text="Contact phone number")
    date_of_joining = models.DateField(default=timezone.localdate, help_text="Date employee joined the organization")
    is_active = models.BooleanField(default=True, help_text="Whether the employee record is active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'
        db_table = 'employees'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"
