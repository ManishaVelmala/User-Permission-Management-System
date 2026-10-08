# 🛡️ Fine-Grained User Permission Management System

A full-stack, enterprise-ready role and permission management system built with **Django REST Framework**, **PostgreSQL**, and **React (Vite)**.

Unlike rigid role-based access control (RBAC), this system implements **fine-grained capability-based authorization**, where individual operational functions (such as `CREATE_EMPLOYEE`, `ASSIGN_PERMISSION`) are decoupled and granted directly to users. Both backend API endpoints and frontend UI controls synchronize dynamically to enforce these permissions.

---

## 📑 Table of Contents
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Core Fine-Grained Permissions](#-core-fine-grained-permissions)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Database Configuration](#1-database-configuration)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Running Automated Tests](#-running-automated-tests)
- [Default Development Accounts](#-default-development-accounts)
- [API Reference](#-api-reference)
  - [Authentication](#authentication)
  - [Users & Permission Assignment](#users--permission-assignment)
  - [Employee Management](#employee-management)
- [Frontend Architecture & UI Gates](#-frontend-architecture--ui-gates)
- [Django Admin Portal](#-django-admin-portal)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ✨ Key Features

- **Decoupled Fine-Grained Permissions**: Granular action capabilities instead of hardcoded roles or monolithic admin flags.
- **Dynamic Frontend Gating**: Reusable `<PermissionGate>` and `hasPermission()` hooks show/hide navigation tabs, buttons, modals, and actions in real time.
- **Strict Backend Verification**: Custom DRF permission classes (`HasRequiredFunction`, `HasAssignPermission`) validate user permissions on every request directly against the database.
- **JWT Authentication**: Secure token-based access with SimpleJWT (`access` and `refresh` tokens, automatic authorization headers).
- **Interactive Permission Matrix UI**: Users with `ASSIGN_PERMISSION` can view all system users and grant or revoke specific capabilities with instant updates.
- **Full Employee CRUD Management**: Complete employee lifecycle management with individual permissions controlling creation, viewing, updating, and deletion.
- **Django Admin Customization**: Rich administrative management interface featuring horizontal filter pickers for permission assignment.
- **100% Test Coverage**: Complete automated test suite covering authentication, fine-grained access control, and employee CRUD operations (55 tests passing).

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                           │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐   ┌───────────────┐   │
│   │    AuthContext     │──>│  PermissionGate   │──>│  Dynamic UI   │   │
│   │ (JWT & Perm State) │   │  (hasPermission)  │   │ Tabs & Actions│   │
│   └────────────────────┘   └───────────────────┘   └───────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Django REST Framework (Backend)                     │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐   ┌───────────────┐   │
│   │   JWT Auth Guard   │──>│HasRequiredFunction│──>│ API Views &   │   │
│   │  (accounts.models) │   │  Permission Class │   │ Serializers   │   │
│   └────────────────────┘   └───────────────────┘   └───────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL Database                           │
│                                                                        │
│      [ users ] <──────( users_functions )──────> [ functions ]        │
│          ▲                                                             │
│          │ (OneToOne)                                                  │
│          ▼                                                             │
│     [ employees ]                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python, Django 6.1, Django REST Framework (DRF), SimpleJWT, `django-cors-headers` |
| **Frontend** | React 19, Vite, Axios, Pure CSS (Modern Dark/Glassmorphic UI) |
| **Database** | PostgreSQL |
| **Testing** | Django Test Framework (55 Unit & Integration tests) |

---

## 📁 Project Directory Structure

```text
User-Permission-Management-System/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example              # Sample environment configuration
│   ├── .env                      # Active environment settings (created during setup)
│   ├── config/                   # Root Django configuration
│   │   ├── settings.py           # Installed apps, CORS, JWT, DB settings
│   │   ├── urls.py               # Root API routing and Django Admin branding
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/                 # User authentication & custom user model
│   │   ├── models.py             # Custom User model (email primary identifier)
│   │   ├── admin.py              # Extended UserAdmin with permission assignment
│   │   ├── serializers.py        # Login & User serializers
│   │   ├── views.py              # LoginView, CurrentUserView (/auth/me/)
│   │   └── management/commands/
│   │       └── seed_test_users.py # Optional command to seed dev accounts
│   ├── permissions/              # Fine-grained capability framework
│   │   ├── models.py             # Function entity definition
│   │   ├── admin.py              # Read-only Function admin with assigned user counts
│   │   ├── permissions.py        # HasRequiredFunction & HasAssignPermission
│   │   ├── serializers.py        # FunctionSerializer, PermissionCodesSerializer
│   │   ├── views.py              # UsersListView, UserPermissionsView, AllFunctionsView
│   │   └── management/commands/
│   │       └── seed_functions.py # Idempotent seeder for the 6 core capabilities
│   └── employees/                # Employee management module
│       ├── models.py             # Employee model linked to User
│       ├── serializers.py        # EmployeeSerializer
│       ├── views.py              # EmployeeListCreateView, DetailView, EmployeeMeView
│       └── tests.py              # Comprehensive test suites
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx              # React DOM root entry
│       ├── App.jsx               # Route definitions and AuthProvider wrapper
│       ├── index.css             # Base resets and typography
│       ├── App.css               # Core styling tokens, responsive layout, glass UI
│       ├── api/
│       │   └── client.js         # Axios instance with automated JWT bearer interceptor
│       ├── context/
│       │   └── AuthContext.jsx   # Auth provider, token storage, and hasPermission helper
│       ├── components/
│       │   ├── PermissionGate.jsx# Conditional renderer based on permission codes
│       │   └── ProtectedRoute.jsx# Auth wrapper for protected views
│       └── pages/
│           ├── LoginPage.jsx     # Clean login interface with credential helpers
│           └── HomePage.jsx      # Unified dashboard (Overview, Employees, Permissions, Profile)
│
└── README.md
```

---

## 🔑 Core Fine-Grained Permissions

The system defines 6 core system functions:

| Function Code | Name | Description | UI / API Effects |
|---|---|---|---|
| `VIEW_EMPLOYEE` | View Employee | Allows browsing employee list and view employee details | Shows **Employees** tab in dashboard; grants access to `GET /api/employees/` and `GET /api/employees/{id}/` |
| `CREATE_EMPLOYEE` | Create Employee | Allows adding and onboarding new employee records | Displays **+ Add Employee** button and modal; grants access to `POST /api/employees/` |
| `EDIT_EMPLOYEE` | Edit Employee | Allows modifying existing employee records | Displays **Edit** action buttons on table rows; grants access to `PUT / PATCH /api/employees/{id}/` |
| `DELETE_EMPLOYEE` | Delete Employee | Allows removing employee records from the system | Displays **Delete** buttons and confirmation prompt; grants access to `DELETE /api/employees/{id}/` |
| `VIEW_SELF` | View Self | Allows user to inspect their own linked employee profile | Shows **My Profile** button/tab; grants access to `GET /api/employees/me/` |
| `ASSIGN_PERMISSION` | Assign Permission | Allows viewing all system users and editing their assigned permissions | Shows **Permission Management** tab; grants access to `GET /api/users/`, `PUT /api/users/{id}/permissions/`, and `/api/permissions/functions/` |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.x or higher (with `npm`)
- **PostgreSQL**: Running locally or accessible via network

---

### 1. Database Configuration

Create a PostgreSQL database for the application:

```sql
CREATE DATABASE fine_grained_permissions;
```

---

### 2. Backend Setup

#### Step A: Navigate to backend folder
```bash
cd backend
```

#### Step B: Activate the Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If you need to create a fresh environment: `python -m venv venv`)*
- **Linux / macOS**:
  ```bash
  source venv/bin/activate
  ```

#### Step C: Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Step D: Configure Environment Variables
Copy `.env.example` to `.env`:
- **Windows (PowerShell)**:
  ```powershell
  Copy-Item .env.example .env
  ```
- **Linux / macOS**:
  ```bash
  cp .env.example .env
  ```

Open `.env` and configure your PostgreSQL credentials:
```env
DJANGO_SECRET_KEY=your-secure-secret-key
DJANGO_DEBUG=True

# Database Configuration
DB_NAME=fine_grained_permissions
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

#### Step E: Apply Database Migrations
```bash
python manage.py migrate
```

#### Step F: Seed Core Permissions
Run the built-in idempotent management command to populate the 6 core system functions:
```bash
python manage.py seed_functions
```

#### Step G: (Optional) Seed Development Test Accounts
To quickly populate test accounts with different permission tiers:
```bash
python manage.py seed_test_users
```

#### Step H: Create a Superuser (for Django Admin)
```bash
python manage.py createsuperuser
```

#### Step I: Start the Backend Server
```bash
python manage.py runserver
```
The backend API is now running at **`http://127.0.0.1:8000/`**.

---

### 3. Frontend Setup

#### Step A: Navigate to frontend folder (in a new terminal)
```bash
cd frontend
```

#### Step B: Install NPM Dependencies
```bash
npm install
```

#### Step C: Start Vite Development Server
```bash
npm run dev
```
The React frontend will be accessible at **`http://localhost:5173/`** (or the port specified by Vite in your console).

---

## 🧪 Running Automated Tests

The application includes an extensive test suite verifying:
- Model integrity and custom user model validation
- Dynamic DRF permission class behavior (`HasRequiredFunction`)
- JWT authentication and token refresh flows
- Permission assignment endpoints (add, replace, remove)
- Employee CRUD operations and permission gating

To execute all 55 tests:
```powershell
cd backend
.\venv\Scripts\python.exe manage.py test
```
All tests should pass:
```text
Ran 55 tests in ~75s
OK
```

---

## 👥 Default Development Accounts

If you ran `python manage.py seed_test_users`, you can log in with these pre-configured test users:

| Email | Password | Assigned Permissions | Purpose |
|---|---|---|---|
| `user2@example.com` | `TestUser2@123` | **All 6 permissions** (`VIEW_EMPLOYEE`, `CREATE_EMPLOYEE`, `EDIT_EMPLOYEE`, `DELETE_EMPLOYEE`, `VIEW_SELF`, `ASSIGN_PERMISSION`) | Full Administrator / Manager access to test all features and permission toggling. |
| `user1@example.com` | `TestUser1@123` | `VIEW_EMPLOYEE`, `VIEW_SELF` | Standard employee view. Can browse the directory and view own profile, but cannot edit, delete, or manage permissions. |
| `user3@example.com` | `TestUser3@123` | *(None - 0 permissions)* | Restricted user. Can log in and view Overview, but has no access to employee data or management tools. |

---

## 📡 API Reference

All protected endpoints require an `Authorization` header:
```text
Authorization: Bearer <your_access_token>
```

### Authentication

#### 1. Log In & Receive JWT Tokens
- **Endpoint**: `POST /api/login/`
- **Request Body**:
  ```json
  {
    "email": "user2@example.com",
    "password": "TestUser2@123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access": "eyJhbGciOiJIUzI1Ni...",
    "refresh": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 2,
      "email": "user2@example.com",
      "first_name": "User",
      "last_name": "Two",
      "permissions": [
        "ASSIGN_PERMISSION",
        "CREATE_EMPLOYEE",
        "DELETE_EMPLOYEE",
        "EDIT_EMPLOYEE",
        "VIEW_EMPLOYEE",
        "VIEW_SELF"
      ]
    }
  }
  ```

#### 2. Get Current Authenticated User Details
- **Endpoint**: `GET /api/auth/me/`
- **Requires**: Any valid JWT token

#### 3. Refresh Access Token
- **Endpoint**: `POST /api/token/refresh/`
- **Request Body**: `{"refresh": "<refresh_token>"}`

---

### Users & Permission Assignment
*(All endpoints below require the `ASSIGN_PERMISSION` function)*

#### 1. List All Users & Current Permissions
- **Endpoint**: `GET /api/users/`
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": 1,
      "email": "user1@example.com",
      "first_name": "User",
      "last_name": "One",
      "is_active": true,
      "permissions": ["VIEW_EMPLOYEE", "VIEW_SELF"]
    }
  ]
  ```

#### 2. List All Available Function Definitions
- **Endpoint**: `GET /api/permissions/functions/`
- **Response** (`200 OK`): Array of `{ "id": 1, "name": "...", "code": "...", "description": "..." }`

#### 3. View Permissions for Specific User
- **Endpoint**: `GET /api/users/{user_id}/permissions/`

#### 4. Overwrite / Replace User Permissions (Full Update)
- **Endpoint**: `PUT /api/users/{user_id}/permissions/`
- **Request Body**:
  ```json
  {
    "function_codes": ["VIEW_EMPLOYEE", "CREATE_EMPLOYEE"]
  }
  ```

#### 5. Add Specific Permissions to User
- **Endpoint**: `POST /api/users/{user_id}/permissions/`
- **Request Body**:
  ```json
  {
    "function_codes": ["DELETE_EMPLOYEE"]
  }
  ```

#### 6. Revoke Specific Permissions from User
- **Endpoint**: `DELETE /api/users/{user_id}/permissions/`
- **Request Body**:
  ```json
  {
    "function_codes": ["DELETE_EMPLOYEE"]
  }
  ```

---

### Employee Management

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/employees/` | `VIEW_EMPLOYEE` | List all employees |
| `POST` | `/api/employees/` | `CREATE_EMPLOYEE` | Create a new employee |
| `GET` | `/api/employees/me/` | `VIEW_SELF` | View current logged-in user's employee profile |
| `GET` | `/api/employees/{id}/` | `VIEW_EMPLOYEE` | Retrieve single employee record |
| `PUT` / `PATCH` | `/api/employees/{id}/` | `EDIT_EMPLOYEE` | Update employee information |
| `DELETE` | `/api/employees/{id}/` | `DELETE_EMPLOYEE` | Delete employee record |

#### Sample Create Employee Request:
```json
POST /api/employees/
{
  "employee_id": "EMP-101",
  "first_name": "Jane",
  "last_name": "Doe",
  "department": "Engineering",
  "job_title": "Full Stack Engineer",
  "email": "jane.doe@example.com",
  "phone": "+1 555-0199"
}
```

---

## 💻 Frontend Architecture & UI Gates

### 1. The `hasPermission()` Helper
Exposed by `AuthContext`, allows case-insensitive permission checks in any component:
```jsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { hasPermission } = useAuth();

  if (hasPermission('CREATE_EMPLOYEE')) {
    return <button>Create</button>;
  }
  return null;
}
```

### 2. The `<PermissionGate>` Component
Declarative UI gating:
```jsx
import PermissionGate from '../components/PermissionGate';

<PermissionGate permission="CREATE_EMPLOYEE">
  <button onClick={openAddModal}>+ Add Employee</button>
</PermissionGate>
```

### 3. Dashboard Tabs Breakdown
1. **Overview**: Displays current user summary, permissions pills, and recent activity log.
2. **Employees** *(Requires `VIEW_EMPLOYEE`)*: Searchable employee table with conditional Add, Edit, and Delete buttons.
3. **Permission Management** *(Requires `ASSIGN_PERMISSION`)*: User picker and live interactive checkbox matrix for updating permissions.
4. **My Profile** *(Requires `VIEW_SELF`)*: Displays personal linked employee record.

---

## 🛡️ Django Admin Portal

For administrative oversight and superuser configuration:

1. Open your browser and go to: **`http://127.0.0.1:8000/admin/`**
2. Sign in with your superuser account.
3. **Users Management** (`/admin/accounts/user/`):
   - Add new users with password hashing.
   - Use the **Fine-Grained Permissions** horizontal filter box to assign or revoke permissions.
4. **Functions Registry** (`/admin/permissions/function/`):
   - View all registered permissions.
   - Inspect which users currently hold each permission.
   - Direct addition/deletion is protected to maintain system integrity.
5. **Employees Management** (`/admin/employees/employee/`):
   - Search, filter by department or active status, and link employee profiles to user accounts.

---

## ❓ Troubleshooting & FAQs

### Database Connection Error
**Issue**: `django.db.utils.OperationalError: could not connect to server`
- **Solution**: Verify PostgreSQL is running locally (`pg_isready` or check Windows Services). Ensure the database name, user, password, and port in `backend/.env` match your PostgreSQL server.

### CORS Errors on Frontend
**Issue**: Frontend Axios requests blocked by CORS policy.
- **Solution**: Ensure the backend server is running on `127.0.0.1:8000`. `backend/config/settings.py` already includes `http://localhost:5173` and `http://127.0.0.1:5173` in `CORS_ALLOWED_ORIGINS`.

### Missing Permissions After Login
**Issue**: A user logged in but cannot see the Employees or Permission tab.
- **Solution**: Verify that the required functions (`VIEW_EMPLOYEE`, `ASSIGN_PERMISSION`, etc.) are assigned to that user in Django Admin or via the Permission Management tab by an administrator (`user2@example.com`).

### 403 Forbidden on API Requests
**Issue**: API requests return `403 Forbidden: You do not have permission to perform this action`.
- **Solution**: The backend checks database records for each specific request. Check that the logged-in user possesses the required capability code listed in the [API Reference](#-api-reference).

---

## 📄 License
This project is open-source and available under the standard development license for internal and educational use.
