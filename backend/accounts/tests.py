from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.email = 'tester@example.com'
        self.password = 'SecurePass123!'
        self.user = User.objects.create_user(
            email=self.email,
            password=self.password,
            first_name='John',
            last_name='Doe'
        )

    def test_user_password_is_hashed(self):
        """Verify user password is not stored in plaintext and is properly hashed."""
        self.assertNotEqual(self.user.password, self.password)
        self.assertTrue(self.user.check_password(self.password))
        self.assertTrue(self.user.password.startswith('pbkdf2_') or self.user.password.startswith('argon2'))

    def test_login_successful(self):
        """FR-1: Successful login returns 200, JWT tokens, and safe user data."""
        response = self.client.post('/api/login/', {
            'email': self.email,
            'password': self.password,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

        user_data = response.data['user']
        self.assertEqual(user_data['email'], self.email)
        self.assertEqual(user_data['first_name'], 'John')
        self.assertEqual(user_data['last_name'], 'Doe')

        # NFR-1: Ensure password or hash is never returned
        self.assertNotIn('password', response.data)
        self.assertNotIn('password', user_data)
        self.assertNotIn('password_hash', user_data)

    def test_login_invalid_password(self):
        """FR-1: Invalid password returns HTTP 401."""
        response = self.client.post('/api/login/', {
            'email': self.email,
            'password': 'WrongPassword!',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)

    def test_login_nonexistent_user(self):
        """FR-1: Non-existent user returns HTTP 401."""
        response = self.client.post('/api/login/', {
            'email': 'nobody@example.com',
            'password': 'SomePassword123!',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)

    def test_auth_me_unauthenticated(self):
        """FR-2: Protected endpoint /api/auth/me/ returns HTTP 401 without valid JWT."""
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_me_authenticated(self):
        """FR-2: Protected endpoint /api/auth/me/ returns HTTP 200 with valid JWT."""
        login_res = self.client.post('/api/login/', {
            'email': self.email,
            'password': self.password,
        }, format='json')
        access_token = login_res.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/auth/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.email)
        self.assertEqual(response.data['first_name'], 'John')
        self.assertEqual(response.data['last_name'], 'Doe')

        # NFR-1: Ensure password is never exposed
        self.assertNotIn('password', response.data)

    def test_auth_me_invalid_token(self):
        """FR-2: Protected endpoint returns HTTP 401 with invalid JWT token."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_xyz')
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


from django.test import Client as DjangoClient
from permissions.models import Function
from employees.models import Employee


class AdminCreatedUserWorkflowTests(TestCase):
    """
    Verification tests for Admin-created users:
    1. Users created through Django Admin can log in through the existing JWT login.
    2. Their permissions come from the database Many-to-Many relationship.
    3. Backend permission checks use those permissions.
    4. Modifying permissions through Django Admin changes access accordingly.
    5. Different users have independent combinations of permissions.
    6. Application works completely without dependency on the previous test users.
    """

    def setUp(self):
        self.admin_client = DjangoClient()
        self.api_client = APIClient()

        # Create admin superuser for Django admin operations
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='AdminPassword123!'
        )
        self.admin_client.force_login(self.admin_user)

        # Retrieve seeded functions
        self.view_emp_func = Function.objects.get(code='VIEW_EMPLOYEE')
        self.create_emp_func = Function.objects.get(code='CREATE_EMPLOYEE')
        self.edit_emp_func = Function.objects.get(code='EDIT_EMPLOYEE')
        self.delete_emp_func = Function.objects.get(code='DELETE_EMPLOYEE')
        self.view_self_func = Function.objects.get(code='VIEW_SELF')

    def test_admin_created_user_jwt_login_and_permission_loading(self):
        """
        1. A user created through Django Admin can log in through existing JWT login.
        2. Their permissions come from the existing database Many-to-Many relationship.
        """
        # Create user via Django Admin POST to /admin/accounts/user/add/
        add_data = {
            'email': 'analyst@company.com',
            'first_name': 'Sarah',
            'last_name': 'Connor',
            'password1': 'SecurePass@2026',
            'password2': 'SecurePass@2026',
            'is_active': 'on',
            'functions': [self.view_emp_func.id, self.view_self_func.id],
        }
        res_admin = self.admin_client.post('/admin/accounts/user/add/', add_data)
        self.assertEqual(res_admin.status_code, 302)

        # Verify user in database
        user = User.objects.get(email='analyst@company.com')
        self.assertEqual(user.first_name, 'Sarah')
        self.assertEqual(user.last_name, 'Connor')
        user_perms = set(user.functions.values_list('code', flat=True))
        self.assertEqual(user_perms, {'VIEW_EMPLOYEE', 'VIEW_SELF'})

        # Log in through existing JWT login endpoint
        login_res = self.api_client.post('/api/login/', {
            'email': 'analyst@company.com',
            'password': 'SecurePass@2026',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)
        self.assertIn('refresh', login_res.data)
        self.assertIn('user', login_res.data)

        # Verify permissions returned in JWT login response
        returned_perms = set(login_res.data['user']['permissions'])
        self.assertEqual(returned_perms, {'VIEW_EMPLOYEE', 'VIEW_SELF'})

        # Verify /api/auth/me/ returns the database permissions
        access_token = login_res.data['access']
        self.api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_res = self.api_client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(set(me_res.data['permissions']), {'VIEW_EMPLOYEE', 'VIEW_SELF'})

    def test_backend_permission_checks_enforce_admin_assigned_permissions(self):
        """
        Backend permission checks allow/deny actions according to permissions
        assigned to the Admin-created user via the Many-to-Many relationship.
        """
        # User created with VIEW_EMPLOYEE only
        user = User.objects.create_user(
            email='viewer@company.com',
            password='ViewerPass@123'
        )
        user.functions.add(self.view_emp_func)

        # Existing employee in system
        Employee.objects.create(
            employee_id='EMP-101',
            first_name='Alex',
            last_name='Morgan',
            department='Design',
            job_title='UI Designer'
        )

        login_res = self.api_client.post('/api/login/', {
            'email': 'viewer@company.com',
            'password': 'ViewerPass@123',
        }, format='json')
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        # Allowed: GET /api/employees/ (requires VIEW_EMPLOYEE)
        get_res = self.api_client.get('/api/employees/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)

        # Denied: POST /api/employees/ (requires CREATE_EMPLOYEE)
        post_res = self.api_client.post('/api/employees/', {
            'employee_id': 'EMP-102',
            'first_name': 'Denied',
            'last_name': 'User',
            'department': 'Design',
            'job_title': 'Intern'
        }, format='json')
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_modifying_permissions_updates_user_access(self):
        """
        Adding/removing permissions through Django Admin change form updates
        the user's access accordingly.
        """
        user = User.objects.create_user(
            email='operator@company.com',
            password='OperatorPass@123'
        )
        user.functions.add(self.view_emp_func)

        login_res = self.api_client.post('/api/login/', {
            'email': 'operator@company.com',
            'password': 'OperatorPass@123',
        }, format='json')
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        # Initially cannot create employee
        post_res1 = self.api_client.post('/api/employees/', {
            'employee_id': 'EMP-201',
            'first_name': 'New',
            'last_name': 'Employee',
            'department': 'Operations',
            'job_title': 'Analyst'
        }, format='json')
        self.assertEqual(post_res1.status_code, status.HTTP_403_FORBIDDEN)

        # Admin adds CREATE_EMPLOYEE via Django Admin change form
        change_data = {
            'email': 'operator@company.com',
            'is_active': 'on',
            'functions': [self.view_emp_func.id, self.create_emp_func.id],
        }
        admin_res = self.admin_client.post(f'/admin/accounts/user/{user.id}/change/', change_data)
        self.assertEqual(admin_res.status_code, 302)

        # User's permissions in DB updated immediately
        user.refresh_from_db()
        self.assertEqual(
            set(user.functions.values_list('code', flat=True)),
            {'VIEW_EMPLOYEE', 'CREATE_EMPLOYEE'}
        )

        # Now permitted to create employee
        post_res2 = self.api_client.post('/api/employees/', {
            'employee_id': 'EMP-201',
            'first_name': 'New',
            'last_name': 'Employee',
            'department': 'Operations',
            'job_title': 'Analyst'
        }, format='json')
        self.assertEqual(post_res2.status_code, status.HTTP_201_CREATED)

        # Admin removes CREATE_EMPLOYEE via Django Admin
        change_data_revoke = {
            'email': 'operator@company.com',
            'is_active': 'on',
            'functions': [self.view_emp_func.id],
        }
        self.admin_client.post(f'/admin/accounts/user/{user.id}/change/', change_data_revoke)
        user.refresh_from_db()
        self.assertEqual(
            set(user.functions.values_list('code', flat=True)),
            {'VIEW_EMPLOYEE'}
        )

        # Creating employee is now denied again
        post_res3 = self.api_client.post('/api/employees/', {
            'employee_id': 'EMP-202',
            'first_name': 'Another',
            'last_name': 'Employee',
            'department': 'Operations',
            'job_title': 'Analyst'
        }, format='json')
        self.assertEqual(post_res3.status_code, status.HTTP_403_FORBIDDEN)

    def test_different_users_have_different_combinations_of_permissions(self):
        """
        Verify that multiple Admin-created users can have distinct, independent
        combinations of permissions from the Many-to-Many relationship.
        """
        # User A: Read-only
        user_a = User.objects.create_user(email='usera@example.com', password='PassA@123')
        user_a.functions.set([self.view_emp_func, self.view_self_func])

        # User B: Editor/Deleter
        user_b = User.objects.create_user(email='userb@example.com', password='PassB@123')
        user_b.functions.set([self.create_emp_func, self.edit_emp_func, self.delete_emp_func])

        # User C: Zero permissions
        user_c = User.objects.create_user(email='userc@example.com', password='PassC@123')

        self.assertEqual(set(user_a.functions.values_list('code', flat=True)), {'VIEW_EMPLOYEE', 'VIEW_SELF'})
        self.assertEqual(set(user_b.functions.values_list('code', flat=True)), {'CREATE_EMPLOYEE', 'EDIT_EMPLOYEE', 'DELETE_EMPLOYEE'})
        self.assertEqual(user_c.functions.count(), 0)

    def test_application_does_not_depend_on_previous_test_users(self):
        """
        Verify that deleting the development test users has no impact on real
        Admin-created users logging in, accessing permissions, and calling APIs.
        """
        # Delete any test users that might exist
        User.objects.filter(email__in=['user1@example.com', 'user2@example.com', 'user3@example.com']).delete()

        # Admin creates a real new user
        real_user = User.objects.create_user(
            email='newemployee@company.com',
            password='RealPassword@2026',
            first_name='Emma',
            last_name='Watson'
        )
        real_user.functions.set([self.view_emp_func])

        # Login works cleanly
        login_res = self.api_client.post('/api/login/', {
            'email': 'newemployee@company.com',
            'password': 'RealPassword@2026',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertEqual(login_res.data['user']['permissions'], ['VIEW_EMPLOYEE'])

