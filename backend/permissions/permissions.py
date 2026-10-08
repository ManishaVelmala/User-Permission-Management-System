from rest_framework.permissions import BasePermission


class HasRequiredFunction(BasePermission):
    """
    Reusable dynamic DRF permission class that checks the database for
    the required Function/permission.
    
    The view can declare:
    - required_function = 'FUNCTION_CODE'
    or method-specific:
    - required_functions = {
        'GET': 'VIEW_EMPLOYEE',
        'POST': 'CREATE_EMPLOYEE',
        'PUT': 'EDIT_EMPLOYEE',
        'PATCH': 'EDIT_EMPLOYEE',
        'DELETE': 'DELETE_EMPLOYEE',
      }
      
    Does NOT use email checks, roles, is_staff, or is_superuser.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        required_code = getattr(view, 'required_function', None)
        if not required_code and hasattr(view, 'required_functions'):
            required_code = view.required_functions.get(request.method)

        if not required_code:
            return True

        has_perm = request.user.functions.filter(code=required_code).exists()
        if not has_perm:
            self.message = f"You do not have permission to perform this action. Requires {required_code}."
            return False

        return True


class HasAssignPermission(BasePermission):
    """
    Reusable DRF permission class specifically checking for ASSIGN_PERMISSION.
    Maintained for direct backward compatibility.
    """
    message = "You do not have permission to assign or manage permissions. Requires ASSIGN_PERMISSION."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.functions.filter(code='ASSIGN_PERMISSION').exists()
