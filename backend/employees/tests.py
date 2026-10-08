from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from employees.models import Employee
from accounts.management.commands.seed_test_users import seed_dev_users

User = get_user_model()


class EmployeeManagementAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        seed_dev_users()
        self.user1 = User.objects.get(email='user1@example.com')  # VIEW_EMPLOYEE, VIEW_SELF
        self.user2 = User.objects.get(email='user2@example.com')  # ALL 6 permissions
        self.user3 = User.objects.get(email='user3@example.com')  # zero permissions

        self.user1_token = str(RefreshToken.for_user(self.user1).access_token)
        self.user2_token = str(RefreshToken.for_user(self.user2).access_token)
        self.user3_token = str(RefreshToken.for_user(self.user3).access_token)

        # Baseline employee linked to user1
        self.emp1 = Employee.objects.create(
            user=self.user1,
            employee_id='EMP-001',
            first_name='Alice',
            last_name='Smith',
            department='Engineering',
            job_title='Software Engineer',
            email='alice@example.com'
        )

    def test_user_with_create_employee_can_create_employee(self):
        """1. User with CREATE_EMPLOYEE (User 2) can create an employee."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        payload = {
            'employee_id': 'EMP-002',
            'first_name': 'Bob',
            'last_name': 'Jones',
            'department': 'Marketing',
            'job_title': 'Content Writer',
            'email': 'bob@example.com',
            'phone': '555-1234',
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['employee_id'], 'EMP-002')
        self.assertTrue(Employee.objects.filter(employee_id='EMP-002').exists())

    def test_user_without_create_employee_gets_403(self):
        """2. User without CREATE_EMPLOYEE (User 1, User 3) gets 403."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        payload = {
            'employee_id': 'EMP-999',
            'first_name': 'Unauthorized',
            'last_name': 'Attempt',
            'department': 'HR',
            'job_title': 'Specialist',
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user3_token}')
        res3 = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res3.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_edit_employee_can_update(self):
        """3. User with EDIT_EMPLOYEE (User 2) can update an employee."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        payload = {
            'job_title': 'Senior Software Engineer',
            'department': 'Engineering'
        }
        res = self.client.patch(f'/api/employees/{self.emp1.id}/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.emp1.refresh_from_db()
        self.assertEqual(self.emp1.job_title, 'Senior Software Engineer')

    def test_user_without_edit_employee_gets_403(self):
        """4. User without EDIT_EMPLOYEE (User 1) gets 403."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.patch(
            f'/api/employees/{self.emp1.id}/',
            {'job_title': 'Hacker'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_delete_employee_can_delete(self):
        """5. User with DELETE_EMPLOYEE (User 2) can delete an employee."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.delete(f'/api/employees/{self.emp1.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Employee.objects.filter(id=self.emp1.id).exists())

    def test_user_without_delete_employee_gets_403(self):
        """6. User without DELETE_EMPLOYEE (User 1) gets 403."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.delete(f'/api/employees/{self.emp1.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Employee.objects.filter(id=self.emp1.id).exists())

    def test_user_with_view_employee_can_list_employees(self):
        """7. User with VIEW_EMPLOYEE (User 1 and User 2) can list employees."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.get('/api/employees/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertGreaterEqual(len(res.data['results']), 1)

    def test_user_without_view_employee_gets_403(self):
        """8. User without VIEW_EMPLOYEE (User 3) gets 403."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user3_token}')
        res = self.client.get('/api/employees/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_list_is_paginated(self):
        """9. Employee list is paginated and contains standard pagination keys."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.get('/api/employees/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('count', res.data)
        self.assertIn('next', res.data)
        self.assertIn('previous', res.data)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)

    def test_user_with_view_self_can_access_employees_me(self):
        """10. User with VIEW_SELF (User 1) can access /employees/me/."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user1_token}')
        res = self.client.get('/api/employees/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['id'], self.emp1.id)
        self.assertEqual(res.data['employee_id'], self.emp1.employee_id)

    def test_employees_me_returns_only_logged_in_users_record(self):
        """11. /employees/me/ returns only the logged-in user's employee record."""
        emp2 = Employee.objects.create(
            user=self.user2,
            employee_id='EMP-002',
            first_name='Admin',
            last_name='User',
            department='Management',
            job_title='Director'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        res = self.client.get('/api/employees/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['id'], emp2.id)
        self.assertEqual(res.data['employee_id'], 'EMP-002')
        self.assertNotEqual(res.data['id'], self.emp1.id)

    def test_user_without_view_self_gets_403(self):
        """12. User without VIEW_SELF (User 3) gets 403 on /employees/me/."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user3_token}')
        res = self.client.get('/api/employees/me/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_requests_return_401(self):
        """13. Unauthenticated requests return 401 across all employee endpoints."""
        self.client.credentials()
        self.assertEqual(self.client.get('/api/employees/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post('/api/employees/', {}).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(f'/api/employees/{self.emp1.id}/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.put(f'/api/employees/{self.emp1.id}/', {}).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.delete(f'/api/employees/{self.emp1.id}/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get('/api/employees/me/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_employee_data_returns_400(self):
        """14. Invalid employee data returns HTTP 400 Bad Request."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user2_token}')
        # Missing required fields
        res_missing = self.client.post('/api/employees/', {
            'department': 'Engineering'
        }, format='json')
        self.assertEqual(res_missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('first_name', res_missing.data)
        self.assertIn('last_name', res_missing.data)
        self.assertIn('employee_id', res_missing.data)

        # Duplicate employee_id
        res_dup = self.client.post('/api/employees/', {
            'employee_id': 'EMP-001',
            'first_name': 'Clone',
            'last_name': 'Employee',
            'department': 'HR',
            'job_title': 'Recruiter'
        }, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('employee_id', res_dup.data)
