from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from .models import Function

User = get_user_model()


class FunctionModelTests(TestCase):
    def test_function_model_can_be_created(self):
        """1. Function model can be created."""
        func = Function.objects.create(
            name="Custom Function",
            code="CUSTOM_FUNC",
            description="A test function"
        )
        self.assertEqual(func.code, "CUSTOM_FUNC")
        self.assertEqual(func.name, "Custom Function")
        self.assertEqual(str(func), "Custom Function (CUSTOM_FUNC)")

    def test_function_code_is_unique(self):
        """2. Function code is unique."""
        Function.objects.create(
            name="Original Function",
            code="UNIQUE_CODE",
            description="Original"
        )
        with self.assertRaises(IntegrityError):
            Function.objects.create(
                name="Duplicate Code Function",
                code="UNIQUE_CODE",
                description="Duplicate"
            )

    def test_function_codes_are_uppercase(self):
        """3. Function codes are uppercase and converted on save."""
        func = Function.objects.create(
            name="Lowercase Test",
            code="lowercase_code",
            description="Should convert to uppercase"
        )
        self.assertEqual(func.code, "LOWERCASE_CODE")

    def test_all_six_required_functions_exist(self):
        """4. All six required functions exist after migration seeding."""
        required_codes = {
            'CREATE_EMPLOYEE',
            'EDIT_EMPLOYEE',
            'DELETE_EMPLOYEE',
            'VIEW_EMPLOYEE',
            'VIEW_SELF',
            'ASSIGN_PERMISSION',
        }
        existing_codes = set(Function.objects.values_list('code', flat=True))
        self.assertTrue(
            required_codes.issubset(existing_codes),
            f"Missing functions: {required_codes - existing_codes}"
        )

    def test_user_can_have_zero_functions(self):
        """5. A user can have zero functions."""
        user = User.objects.create_user(
            email="zero_func@example.com",
            password="Password123!"
        )
        self.assertEqual(user.functions.count(), 0)

    def test_user_can_have_one_function(self):
        """6. A user can have one function."""
        user = User.objects.create_user(
            email="one_func@example.com",
            password="Password123!"
        )
        func = Function.objects.get(code="VIEW_SELF")
        user.functions.add(func)

        self.assertEqual(user.functions.count(), 1)
        self.assertIn(func, user.functions.all())

    def test_user_can_have_multiple_functions(self):
        """7. A user can have multiple functions."""
        user = User.objects.create_user(
            email="multi_func@example.com",
            password="Password123!"
        )
        f1 = Function.objects.get(code="CREATE_EMPLOYEE")
        f2 = Function.objects.get(code="EDIT_EMPLOYEE")
        f3 = Function.objects.get(code="VIEW_EMPLOYEE")

        user.functions.add(f1, f2, f3)
        self.assertEqual(user.functions.count(), 3)
        self.assertTrue(set(user.functions.all()).issuperset({f1, f2, f3}))

    def test_function_can_be_assigned_to_multiple_users(self):
        """8. A function can be assigned to multiple users."""
        u1 = User.objects.create_user(email="test_u1@example.com", password="Password123!")
        u2 = User.objects.create_user(email="test_u2@example.com", password="Password123!")

        func = Function.objects.get(code="ASSIGN_PERMISSION")
        func.users.add(u1, u2)

        self.assertEqual(func.users.count(), 2)
        self.assertIn(u1, func.users.all())
        self.assertIn(u2, func.users.all())
        self.assertIn(func, u1.functions.all())
        self.assertIn(func, u2.functions.all())


from accounts.management.commands.seed_test_users import seed_dev_users


class DevTestUsersVerificationTests(TestCase):
    def setUp(self):
        seed_dev_users()

    def test_user1_has_exact_permissions(self):
        """Confirm user1@example.com has exactly: VIEW_EMPLOYEE, VIEW_SELF"""
        user1 = User.objects.get(email='user1@example.com')
        perms = set(user1.functions.values_list('code', flat=True))
        expected = {'VIEW_EMPLOYEE', 'VIEW_SELF'}
        self.assertEqual(perms, expected)
        self.assertTrue(user1.check_password('TestUser1@123'))
        self.assertFalse(user1.is_staff)
        self.assertFalse(user1.is_superuser)

    def test_user2_has_exact_permissions(self):
        """Confirm user2@example.com has all six permissions."""
        user2 = User.objects.get(email='user2@example.com')
        perms = set(user2.functions.values_list('code', flat=True))
        expected = {
            'CREATE_EMPLOYEE',
            'EDIT_EMPLOYEE',
            'DELETE_EMPLOYEE',
            'VIEW_EMPLOYEE',
            'VIEW_SELF',
            'ASSIGN_PERMISSION'
        }
        self.assertEqual(perms, expected)
        self.assertTrue(user2.check_password('TestUser2@123'))
        self.assertFalse(user2.is_staff)
        self.assertFalse(user2.is_superuser)

    def test_user3_has_zero_permissions(self):
        """Confirm user3@example.com has zero permissions."""
        user3 = User.objects.get(email='user3@example.com')
        self.assertEqual(user3.functions.count(), 0)
        self.assertTrue(user3.check_password('TestUser3@123'))
        self.assertFalse(user3.is_staff)
        self.assertFalse(user3.is_superuser)

    def test_seeding_is_idempotent(self):
        """Verify re-running seeding does not duplicate users or permissions."""
        seed_dev_users()
        self.assertEqual(User.objects.filter(email='user1@example.com').count(), 1)
        self.assertEqual(User.objects.filter(email='user2@example.com').count(), 1)
        self.assertEqual(User.objects.filter(email='user3@example.com').count(), 1)


from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


class PermissionAssignmentAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        seed_dev_users()
        self.user1 = User.objects.get(email='user1@example.com')
        self.user2 = User.objects.get(email='user2@example.com')
        self.user3 = User.objects.get(email='user3@example.com')

        # Generate JWT tokens
        self.user1_token = str(RefreshToken.for_user(self.user1).access_token)
        self.user2_token = str(RefreshToken.for_user(self.user2).access_token)
        self.user3_token = str(RefreshToken.for_user(self.user3).access_token)

    def test_user2_can_view_another_users_permissions(self):
        """1. User 2 (with ASSIGN_PERMISSION) can view another user's permissions."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.get(f'/api/users/{self.user1.id}/permissions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [p['code'] for p in res.data['permissions']]
        self.assertIn('VIEW_EMPLOYEE', codes)
        self.assertIn('VIEW_SELF', codes)
        self.assertEqual(len(codes), 2)
        # Ensure password is never exposed
        self.assertNotIn('password', res.data)

    def test_user2_can_add_one_permission(self):
        """2. User 2 can add one permission."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.post(
            f'/api/users/{self.user3.id}/permissions/',
            {'function_codes': ['VIEW_EMPLOYEE']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user3.refresh_from_db()
        self.assertTrue(self.user3.functions.filter(code='VIEW_EMPLOYEE').exists())
        self.assertEqual(self.user3.functions.count(), 1)

    def test_user2_can_add_multiple_permissions(self):
        """3. User 2 can add multiple permissions (and handles case-insensitivity)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.post(
            f'/api/users/{self.user3.id}/permissions/',
            {'function_codes': ['create_employee', 'edit_employee']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user3.refresh_from_db()
        self.assertTrue(self.user3.functions.filter(code='CREATE_EMPLOYEE').exists())
        self.assertTrue(self.user3.functions.filter(code='EDIT_EMPLOYEE').exists())
        self.assertEqual(self.user3.functions.count(), 2)

    def test_user2_can_remove_one_permission(self):
        """4. User 2 can remove one permission."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.delete(
            f'/api/users/{self.user1.id}/permissions/',
            {'function_codes': ['VIEW_SELF']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertFalse(self.user1.functions.filter(code='VIEW_SELF').exists())
        self.assertTrue(self.user1.functions.filter(code='VIEW_EMPLOYEE').exists())
        self.assertEqual(self.user1.functions.count(), 1)

    def test_user2_can_remove_multiple_permissions(self):
        """5. User 2 can remove multiple permissions."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.delete(
            f'/api/users/{self.user1.id}/permissions/',
            {'function_codes': ['view_employee', 'VIEW_SELF']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.functions.count(), 0)

    def test_user1_gets_403_for_viewing_permissions(self):
        """6. User 1 gets 403 for viewing permissions."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.get(f'/api/users/{self.user3.id}/permissions/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user1_gets_403_for_adding_permissions(self):
        """7. User 1 gets 403 for adding permissions."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.post(
            f'/api/users/{self.user3.id}/permissions/',
            {'function_codes': ['CREATE_EMPLOYEE']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user1_gets_403_for_removing_permissions(self):
        """8. User 1 gets 403 for removing permissions."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.delete(
            f'/api/users/{self.user2.id}/permissions/',
            {'function_codes': ['DELETE_EMPLOYEE']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_requests_get_401(self):
        """9. Unauthenticated requests get 401 across GET, POST, and DELETE."""
        self.client.credentials()  # Clear credentials
        res_get = self.client.get(f'/api/users/{self.user1.id}/permissions/')
        self.assertEqual(res_get.status_code, status.HTTP_401_UNAUTHORIZED)

        res_post = self.client.post(
            f'/api/users/{self.user1.id}/permissions/',
            {'function_codes': ['CREATE_EMPLOYEE']},
            format='json'
        )
        self.assertEqual(res_post.status_code, status.HTTP_401_UNAUTHORIZED)

        res_del = self.client.delete(
            f'/api/users/{self.user1.id}/permissions/',
            {'function_codes': ['VIEW_SELF']},
            format='json'
        )
        self.assertEqual(res_del.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unknown_function_code_returns_validation_error(self):
        """10. Unknown function code returns HTTP 400 validation error."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.post(
            f'/api/users/{self.user3.id}/permissions/',
            {'function_codes': ['UNKNOWN_CODE', 'INVALID_PERMISSION']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('function_codes', res.data)
        self.assertFalse(Function.objects.filter(code='UNKNOWN_CODE').exists())

    def test_duplicate_assignment_does_not_create_duplicates(self):
        """11. Duplicate assignment does not create duplicates."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.post(
            f'/api/users/{self.user1.id}/permissions/',
            {'function_codes': ['VIEW_EMPLOYEE', 'view_employee']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.functions.filter(code='VIEW_EMPLOYEE').count(), 1)
        self.assertEqual(self.user1.functions.count(), 2)

    def test_user2_can_put_replace_permissions(self):
        """12. User 2 can replace all permissions for a user using PUT."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.put(
            f'/api/users/{self.user3.id}/permissions/',
            {'function_codes': ['CREATE_EMPLOYEE', 'DELETE_EMPLOYEE']},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user3.refresh_from_db()
        self.assertEqual(self.user3.functions.count(), 2)
        self.assertTrue(self.user3.functions.filter(code='CREATE_EMPLOYEE').exists())
        self.assertTrue(self.user3.functions.filter(code='DELETE_EMPLOYEE').exists())

    def test_user2_can_put_empty_list_to_clear_all_permissions(self):
        """13. User 2 can set empty function_codes to clear all permissions via PUT."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.put(
            f'/api/users/{self.user1.id}/permissions/',
            {'function_codes': []},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.functions.count(), 0)

    def test_user2_can_list_users(self):
        """14. User with ASSIGN_PERMISSION can list all users."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        emails = [u['email'] for u in res.data]
        self.assertIn('user1@example.com', emails)
        self.assertIn('user2@example.com', emails)
        # Ensure passwords not exposed
        for u in res.data:
            self.assertNotIn('password', u)

    def test_user1_cannot_list_users_403(self):
        """15. User without ASSIGN_PERMISSION gets 403 when listing users."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user2_can_list_all_functions(self):
        """16. User with ASSIGN_PERMISSION can list available system functions."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.get('/api/permissions/functions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [f['code'] for f in res.data]
        self.assertIn('CREATE_EMPLOYEE', codes)
        self.assertIn('ASSIGN_PERMISSION', codes)

    def test_user1_cannot_list_all_functions_403(self):
        """17. User without ASSIGN_PERMISSION gets 403 on functions list."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.get('/api/permissions/functions/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)



