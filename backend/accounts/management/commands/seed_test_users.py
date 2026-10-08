from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from permissions.models import Function

User = get_user_model()

DEV_TEST_USERS = [
    {
        'email': 'user1@example.com',
        'password': 'TestUser1@123',
        'first_name': 'User',
        'last_name': 'One',
        'permissions': ['VIEW_EMPLOYEE', 'VIEW_SELF'],
    },
    {
        'email': 'user2@example.com',
        'password': 'TestUser2@123',
        'first_name': 'User',
        'last_name': 'Two',
        'permissions': [
            'CREATE_EMPLOYEE',
            'EDIT_EMPLOYEE',
            'DELETE_EMPLOYEE',
            'VIEW_EMPLOYEE',
            'VIEW_SELF',
            'ASSIGN_PERMISSION',
        ],
    },
    {
        'email': 'user3@example.com',
        'password': 'TestUser3@123',
        'first_name': 'User',
        'last_name': 'Three',
        'permissions': [],
    },
]


def seed_dev_users():
    """Idempotently creates or updates the three development test users."""
    seeded = []
    for data in DEV_TEST_USERS:
        user, created = User.objects.get_or_create(
            email=data['email'],
            defaults={
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            }
        )
        # Always ensure proper password hashing and standard user flags
        user.set_password(data['password'])
        user.is_staff = False
        user.is_superuser = False
        user.is_active = True
        user.save()

        # Update permission assignments
        if data['permissions']:
            funcs = Function.objects.filter(code__in=data['permissions'])
            user.functions.set(funcs)
        else:
            user.functions.clear()

        seeded.append({
            'user': user,
            'created': created,
            'permissions': list(user.functions.values_list('code', flat=True))
        })
    return seeded


class Command(BaseCommand):
    help = (
        'Optional development/test helper: Idempotently seeds the three development '
        'test users with fine-grained permissions. Not required for normal application '
        'usage, where users are created and managed via Django Admin (/admin/).'
    )

    def handle(self, *args, **options):
        results = seed_dev_users()
        for res in results:
            action = 'Created' if res['created'] else 'Updated'
            perms = res['permissions'] or ['(none)']
            self.stdout.write(self.style.SUCCESS(
                f"{action} {res['user'].email} | Permissions: {', '.join(perms)}"
            ))
