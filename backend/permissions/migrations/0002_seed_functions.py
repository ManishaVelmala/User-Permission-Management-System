from django.db import migrations

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


def seed_functions(apps, schema_editor):
    Function = apps.get_model('permissions', 'Function')
    for func in INITIAL_FUNCTIONS:
        Function.objects.update_or_create(
            code=func['code'],
            defaults={
                'name': func['name'],
                'description': func['description'],
            }
        )


def unseed_functions(apps, schema_editor):
    Function = apps.get_model('permissions', 'Function')
    codes = [func['code'] for func in INITIAL_FUNCTIONS]
    Function.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('permissions', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_functions, reverse_code=unseed_functions),
    ]
