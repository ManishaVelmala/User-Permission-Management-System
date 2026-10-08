from django.contrib import admin
from .models import Function


class UserInline(admin.TabularInline):
    """
    Inline that shows, on a Function's admin page,
    which users currently have this permission assigned.
    Read-only — permission assignment is done via the User admin.
    """
    # We reference the through/M2M manager on the User model side.
    # Django doesn't support direct M2M inlines without a through model,
    # so we use a read-only approach via a proxy method.
    model = Function.users.through  # accounts_user_functions join table
    verbose_name = 'Assigned User'
    verbose_name_plural = 'Users with this Permission'
    extra = 0
    can_delete = False
    fields = ('user',)
    readonly_fields = ('user',)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Function)
class FunctionAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'description', 'assigned_user_count')
    search_fields = ('code', 'name', 'description')
    ordering = ('code',)
    inlines = [UserInline]
    readonly_fields = ('code', 'name', 'description')

    @admin.display(description='Users Assigned')
    def assigned_user_count(self, obj):
        return obj.users.count()

    def has_add_permission(self, request):
        # Prevent admins from accidentally creating duplicate/extra function codes.
        # Functions are seeded via management command and should not be created ad-hoc.
        return False

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of core permission definitions.
        return False
