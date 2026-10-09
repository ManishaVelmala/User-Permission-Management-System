# Fine-Grained User Permission Management System

A full-stack application for managing employee records and assigning
fine-grained permissions to users. The project uses Django REST
Framework, PostgreSQL, JWT authentication, and React (Vite).

Authorization is based on individual function permissions assigned
directly to users. The backend enforces permissions on every protected
API request, while the React frontend uses the same permission codes to
control which features are displayed.

## Table of Contents

-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Architecture](#architecture)
-   [Project Structure](#project-structure)
-   [Permission Functions](#permission-functions)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [1. Configure PostgreSQL](#1-configure-postgresql)
    -   [2. Configure the Backend](#2-configure-the-backend)
    -   [3. Configure the Frontend](#3-configure-the-frontend)
-   [User and Permission Setup](#user-and-permission-setup)
-   [Running Automated Tests](#running-automated-tests)
-   [API Reference](#api-reference)
    -   [Authentication](#authentication)
    -   [User and Permission
        Management](#user-and-permission-management)
    -   [Employee Management](#employee-management)
-   [Frontend Permission Handling](#frontend-permission-handling)
-   [Django Admin](#django-admin)
-   [HTTP Status Codes](#http-status-codes)
-   [Troubleshooting](#troubleshooting)

## Features

-   Email-and-password authentication using JSON Web Tokens (JWT).
-   Direct Many-to-Many relationship between users and function
    permissions.
-   Six predefined permission functions.
-   Permission assignment, replacement, and revocation.
-   Employee creation, viewing, updating, and deletion.
-   Paginated employee listing.
-   A self-profile endpoint for the authenticated user's linked employee
    record.
-   Reusable backend permission classes for dynamic authorization.
-   React UI controls and navigation that respond to the signed-in
    user's permissions.
-   Django Admin support for creating users and assigning permissions.
-   Automated backend tests for authentication, permissions, and
    employee functionality.

## Technology Stack

  Layer             Technology              Purpose
  ----------------- ----------------------- -------------------------------------------
  Backend           Python, Django          Application logic and configuration
  API               Django REST Framework   REST API endpoints and validation
  Authentication    SimpleJWT               Access and refresh tokens
  Database          PostgreSQL              Persistent application data
  Frontend          React, Vite             User interface
  HTTP client       Axios                   Frontend API requests
  API testing       Postman                 Manual endpoint and authorization testing
  Version control   Git and GitHub          Source code management

## Architecture

``` text
React Frontend
  ├── Authentication context and JWT handling
  ├── Protected routes
  └── Permission-aware navigation and controls
                |
                | HTTP requests with Bearer access token
                v
Django REST Framework
  ├── Authentication
  ├── Reusable permission checks
  ├── User and permission APIs
  └── Employee APIs
                |
                v
PostgreSQL
  ├── Users
  ├── Functions
  ├── User-function Many-to-Many relationship
  └── Employee records
```

## Project Structure

``` text
User-Permission-Management-System/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/
│   ├── accounts/
│   ├── permissions/
│   └── employees/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── README.md
```

The backend apps are organized by responsibility:

-   `accounts`: custom user model, login, and current-user endpoints.
-   `permissions`: function definitions, permission checks, and
    permission assignment APIs.
-   `employees`: employee records and employee management APIs.
-   `config`: Django settings and root URL configuration.

## Permission Functions

The system seeds the following function definitions:

  ----------------------------------------------------------------------------------
  Function code           Purpose                 Related API action
  ----------------------- ----------------------- ----------------------------------
  `CREATE_EMPLOYEE`       Create employee records `POST /api/employees/`

  `EDIT_EMPLOYEE`         Update employee records `PUT/PATCH /api/employees/{id}/`

  `DELETE_EMPLOYEE`       Delete employee records `DELETE /api/employees/{id}/`

  `VIEW_EMPLOYEE`         View the employee       `GET /api/employees/`,
                          directory and           `GET /api/employees/{id}/`
                          individual records      

  `VIEW_SELF`             View the signed-in      `GET /api/employees/me/`
                          user's linked employee  
                          profile                 

  `ASSIGN_PERMISSION`     View users and assign,  User and function permission APIs
                          replace, or revoke      
                          their permissions       
  ----------------------------------------------------------------------------------

Permissions are assigned directly to users through a Many-to-Many
relationship. The application does not require a fixed set of roles to
determine access. Each user's allowed actions depend on the function
permissions assigned to that account.

## Getting Started

### Prerequisites

Install the following:

-   Python 3.10 or later, compatible with the dependencies in
    `backend/requirements.txt`
-   Node.js and npm
-   PostgreSQL
-   Git

### 1. Configure PostgreSQL

Create a database in PostgreSQL. For example:

``` sql
CREATE DATABASE fine_grained_permissions;
```

Use the database name configured in your environment file. If your local
database has a different name, update `DB_NAME` accordingly.

### 2. Configure the Backend

Open PowerShell at the repository root and run:

``` powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create the local environment file from the example:

``` powershell
Copy-Item .env.example .env
```

Edit `backend/.env` and set the values required by your project.
Example:

``` env
DJANGO_SECRET_KEY=replace-with-a-secure-local-secret
DJANGO_DEBUG=True

DB_NAME=fine_grained_permissions
DB_USER=postgres
DB_PASSWORD=postgresql
DB_HOST=localhost
DB_PORT=5432
```

Use the exact environment variable names expected by
`backend/config/settings.py`. Do not commit the real `.env` file or
share database passwords, secret keys, or tokens.

Apply migrations and seed the six permission functions:

``` powershell
python manage.py migrate
python manage.py seed_functions
```

The `seed_functions` command should be safe to run more than once and
should not create duplicate function definitions.

Create a Django superuser for the administration portal:

``` powershell
python manage.py createsuperuser
```

Start the backend:

``` powershell
python manage.py runserver
```

The local backend should be available at `http://127.0.0.1:8000/`.

Keep this terminal open while using the application.

### 3. Configure the Frontend

Open a second terminal at the repository root:

``` powershell
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite, usually
`http://localhost:5173/`.

The backend and PostgreSQL service must be running for API-driven
features to work.

## User and Permission Setup

The normal setup workflow is:

1.  Start the backend and open the Django Admin portal at
    `http://127.0.0.1:8000/admin/`.
2.  Sign in with the Django superuser account created during setup.
3.  Create user accounts through Django Admin.
4.  Assign the required function permissions to each user through the
    user administration interface.
5.  Create and link employee records as needed.
6.  Sign in to the React application using an ordinary user's own email
    and password.
7.  Verify that the UI and API access match that user's assigned
    permissions.

The Django superuser used to administer Django Admin is separate from
the application's `ASSIGN_PERMISSION` capability. Application API
authorization must rely on the assigned function permissions, not on a
user's email, fixed user ID, `is_staff`, or `is_superuser` status.

Development test accounts are not required for normal application usage.
If a local development seeding command for test users exists in the
codebase, use it only when you intentionally need those test accounts.
Do not rely on such accounts for production or real-user workflows.

## Running Automated Tests

From the repository root, run:

``` powershell
cd backend
.\venv\Scripts\python.exe manage.py test
```

You can also run Django's configuration check:

``` powershell
python manage.py check
```

The tests should cover relevant behavior such as:

-   Login success and invalid credentials.
-   Protected endpoints and unauthenticated requests.
-   Function definitions and user-function assignments.
-   Permission assignment restrictions.
-   Employee creation, viewing, updating, and deletion.
-   HTTP 401 responses for unauthenticated requests.
-   HTTP 403 responses for authenticated users who lack the required
    permission.

Use the actual test output when reporting the test count or results. A
passing test suite does not by itself establish a particular percentage
of code coverage.

## API Reference

Protected endpoints require a valid access token in the request header:

``` http
Authorization: Bearer <access_token>
```

### Authentication

#### 1. Login

**Endpoint:** `POST /api/login/`

Request body:

``` json
{
  "email": "your-user@example.com",
  "password": "your-password"
}
```

On success, the API returns access and refresh tokens along with safe
user information and assigned permission codes. Use the credentials of a
user that has actually been created in your database.

-   Valid credentials: `200 OK`
-   Invalid credentials: `401 Unauthorized`

#### 2. Get Current User

**Endpoint:** `GET /api/auth/me/`

Requires a valid access token. Returns information about the
authenticated user, including assigned permission codes where provided
by the API.

#### 3. Refresh Access Token

**Endpoint:** `POST /api/token/refresh/`

Request body:

``` json
{
  "refresh": "<refresh_token>"
}
```

Send a valid refresh token to obtain a new access token. Do not share or
commit real tokens.

### User and Permission Management

These endpoints require authentication and the `ASSIGN_PERMISSION`
function.

  -------------------------------------------------------------------------------------
  Method                  Endpoint                              Purpose
  ----------------------- ------------------------------------- -----------------------
  `GET`                   `/api/users/`                         List users

  `GET`                   `/api/permissions/functions/`         List available function
                                                                definitions

  `GET`                   `/api/users/{user_id}/permissions/`   Retrieve a user's
                                                                permissions

  `POST`                  `/api/users/{user_id}/permissions/`   Add specified
                                                                permissions

  `PUT`                   `/api/users/{user_id}/permissions/`   Replace the user's
                                                                permission set

  `DELETE`                `/api/users/{user_id}/permissions/`   Remove specified
                                                                permissions
  -------------------------------------------------------------------------------------

Use the numeric ID of a user that exists in your database. Do not assume
that user IDs are fixed across databases.

Example request body for adding permissions:

``` json
{
  "function_codes": ["VIEW_EMPLOYEE", "CREATE_EMPLOYEE"]
}
```

Example request body for revoking permissions:

``` json
{
  "function_codes": ["CREATE_EMPLOYEE"]
}
```

Example request body for replacing the complete permission set:

``` json
{
  "function_codes": ["VIEW_SELF"]
}
```

The exact behavior of each method should match the implemented API.
Invalid function codes should be rejected rather than silently creating
new function definitions.

### Employee Management

  --------------------------------------------------------------------------------
  Method            Endpoint                 Required function   Purpose
  ----------------- ------------------------ ------------------- -----------------
  `GET`             `/api/employees/`        `VIEW_EMPLOYEE`     List employees
                                                                 (paginated)

  `POST`            `/api/employees/`        `CREATE_EMPLOYEE`   Create an
                                                                 employee

  `GET`             `/api/employees/me/`     `VIEW_SELF`         View the current
                                                                 user's linked
                                                                 employee record

  `GET`             `/api/employees/{id}/`   `VIEW_EMPLOYEE`     Retrieve an
                                                                 employee

  `PUT` / `PATCH`   `/api/employees/{id}/`   `EDIT_EMPLOYEE`     Update an
                                                                 employee

  `DELETE`          `/api/employees/{id}/`   `DELETE_EMPLOYEE`   Delete an
                                                                 employee
  --------------------------------------------------------------------------------

Example create request:

``` http
POST /api/employees/
Content-Type: application/json
Authorization: Bearer <access_token>
```

``` json
{
  "employee_id": "EMP-101",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane.doe@example.com",
  "department": "Engineering",
  "job_title": "Software Developer",
  "phone": "+1 555-0199"
}
```

The employee serializer may accept additional fields, or apply defaults,
according to the current implementation. Use the API response to
identify validation errors.

The `/api/employees/me/` endpoint returns the employee record linked to
the authenticated user. A user must have an associated employee record
to retrieve that profile successfully.

## Frontend Permission Handling

The frontend uses authentication context to keep track of the signed-in
user and assigned permission codes. A helper such as `hasPermission()`
and the reusable `PermissionGate` component can control visibility of UI
elements.

For example:

``` jsx
<PermissionGate permission="CREATE_EMPLOYEE">
  <button onClick={openAddModal}>Add Employee</button>
</PermissionGate>
```

The frontend controls presentation only. It is not a security boundary:
the backend must independently check the required permission for every
protected operation.

## Django Admin

Open `http://127.0.0.1:8000/admin/` and sign in with the Django
superuser account.

Use Django Admin to:

-   Create and manage user accounts.
-   Assign function permissions to users.
-   Inspect the registered function definitions.
-   Manage employee records, where configured in the admin interface.

A Django superuser's administrative privileges do not automatically
grant the application-specific `ASSIGN_PERMISSION` function. Assign that
function explicitly when the account needs to manage permissions through
the application APIs.

## HTTP Status Codes

  -----------------------------------------------------------------------
  Status                  Meaning                 Example
  ----------------------- ----------------------- -----------------------
  `200 OK`                Request succeeded       Login, listing, or
                                                  permission operation
                                                  succeeded

  `201 Created`           Resource created        Employee created
                                                  successfully

  `400 Bad Request`       Invalid input           Required field missing
                                                  or unknown function
                                                  code

  `401 Unauthorized`      Authentication missing  No valid access token
                          or invalid              or invalid login
                                                  credentials

  `403 Forbidden`         Authenticated but lacks User attempts an
                          required permission     operation without its
                                                  function permission

  `404 Not Found`         Resource does not exist Requested employee or
                                                  user ID is not found
  -----------------------------------------------------------------------

The actual status for a particular operation depends on the endpoint's
implementation and validation rules.

## Troubleshooting

### Database connection error

-   Confirm that the PostgreSQL service is running.
-   Check `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`
    in `backend/.env`.
-   Verify that the database exists and that the configured database
    user can connect to it.

### Frontend API or CORS error

-   Confirm that Django is running at `http://127.0.0.1:8000/`.
-   Confirm that Vite is running at the address shown in its terminal.
-   Verify that the frontend origin is included in
    `CORS_ALLOWED_ORIGINS` in the Django settings.

### A user cannot see a feature

-   Check the user's assigned function permissions in Django Admin.
-   Confirm that the frontend has loaded the latest user permissions
    after login.
-   Check the API response. The backend should return `403 Forbidden`
    when an authenticated user lacks the required permission.

### Refresh token request fails

-   Use the `refresh` value from a successful login response, not the
    `access` value.
-   Send the refresh token as JSON in the request body.
-   Check that the token has not expired and that the endpoint URL is
    correct.

## Security Notes

-   Do not commit `backend/.env`, real passwords, secret keys, or JWTs.
-   Use a strong secret key and `DEBUG=False` for a production
    deployment.
-   Use HTTPS in production.
-   Give each user only the permissions required for their work.
-   Never rely on frontend button visibility alone to enforce
    authorization.
-   Do not use hardcoded email addresses or fixed user IDs to grant
    access.

