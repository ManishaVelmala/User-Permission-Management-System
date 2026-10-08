from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django import forms
from .models import User


class CustomUserCreationForm(UserCreationForm):
    """
    Extended user creation form that includes first_name, last_name,
    and the functions (fine-grained permissions) M2M field.
    """
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('email', 'first_name', 'last_name', 'functions')


class CustomUserChangeForm(UserChangeForm):
    """Extended user change form for the custom User model."""
    class Meta(UserChangeForm.Meta):
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    # ── List view ──────────────────────────────────────────────────────────
    list_display = (
        'email',
        'first_name',
        'last_name',
        'is_active',
        'is_staff',
        'get_assigned_permissions',
    )
    list_filter = ('is_active', 'is_staff', 'functions')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    # ── Edit view (change form) ────────────────────────────────────────────
    fieldsets = (
        (None, {
            'fields': ('email', 'password'),
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name'),
        }),
        ('Fine-Grained Permissions', {
            'description': (
                'Select the application permissions for this user. '
                'These control what actions the user can perform in the React application.'
            ),
            'fields': ('functions',),
        }),
        ('Account Status', {
            'description': 'Control whether this user can log in and access admin.',
            'fields': ('is_active', 'is_staff', 'is_superuser'),
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',),
        }),
    )
    filter_horizontal = ('functions',)
    readonly_fields = ('last_login', 'date_joined')

    # ── Add view (creation form) ───────────────────────────────────────────
    add_fieldsets = (
        ('Account Credentials', {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
        ('Personal Information', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name'),
        }),
        ('Fine-Grained Permissions', {
            'classes': ('wide',),
            'description': (
                'Assign application permissions to this user. '
                'These determine what the user can do once they log in via the React application.'
            ),
            'fields': ('functions',),
        }),
        ('Account Status', {
            'classes': ('wide',),
            'fields': ('is_active',),
        }),
    )

    # ── Custom columns ─────────────────────────────────────────────────────
    @admin.display(description='Assigned Permissions')
    def get_assigned_permissions(self, obj):
        codes = obj.functions.values_list('code', flat=True).order_by('code')
        if not codes:
            return '(none)'
        return ', '.join(codes)
