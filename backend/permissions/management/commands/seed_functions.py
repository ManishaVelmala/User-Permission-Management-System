from django.core.management.base import BaseCommand
from ...models import Function

INITIAL_FUNCTIONS = [
    {
        'name': 'Create Employee',
        'code': 'CREATE_EMPLOYEE',
        'description': 'Allows creating and onboarding new employee records in the system.',
    },
    {
        'name': 'Edit Employee',
        'code': 'EDIT_EMPLOYEE',
        'description': 'Allows updating existing employee details and records.',
    },
    {
        'name': 'Delete Employee',
        'code': 'DELETE_EMPLOYEE',
        'description': 'Allows removing employee records from the system.',
    },
    {
        'name': 'View Employee',
        'code': 'VIEW_EMPLOYEE',
        'description': 'Allows viewing details and listing of all company employees.',
    },
    {
        'name': 'View Self',
        'code': 'VIEW_SELF',
        'description': 'Allows an authenticated employee to view their own profile and employee record.',
    },
    {
        'name': 'Assign Permission',
        'code': 'ASSIGN_PERMISSION',
        'description': 'Allows granting or revoking fine-grained functions/permissions for users.',
    },
]


class Command(BaseCommand):
    help = 'Seeds or updates the six required core system functions idempotently.'

    def handle(self, *args, **options):
        for func in INITIAL_FUNCTIONS:
            obj, created = Function.objects.update_or_create(
                code=func['code'],
                defaults={
                    'name': func['name'],
                    'description': func['description'],
                }
            )
            status_text = 'Created' if created else 'Updated/Verified'
            self.stdout.write(self.style.SUCCESS(f"{status_text} function: {obj.code} - {obj.name}"))
