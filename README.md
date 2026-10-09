# Fine-Grained User Permission Management System

A full-stack application for managing employees and assigning
permissions to users.

**Technologies:** Django, Django REST Framework, PostgreSQL, JWT, React,
and Vite.

## Features

-   Login using email and password.
-   JWT authentication for protected APIs.
-   Assign permissions directly to users.
-   Create, view, update, and delete employee records based on
    permissions.
-   React interface that shows features according to the signed-in
    user's permissions.

## Required Permissions

The application uses these six function codes:

-   `CREATE_EMPLOYEE`
-   `EDIT_EMPLOYEE`
-   `DELETE_EMPLOYEE`
-   `VIEW_EMPLOYEE`
-   `VIEW_SELF`
-   `ASSIGN_PERMISSION`

A user's access depends on the function permissions assigned to that
user. The backend checks permissions for protected API requests.

## Project Setup

### 1. Install the requirements

Install Python, Node.js/npm, and PostgreSQL.

### 2. Create the PostgreSQL database

Create a database in PostgreSQL:

``` sql
CREATE DATABASE fine_grained_permissions;
```

If you use a different database name, use that same name in the backend
environment file.

### 3. Set up the backend

Open PowerShell in the project folder:

``` powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create your local environment file by copying the example file:

``` powershell
Copy-Item .env.example .env
```

If the project does not include `.env.example`, create a `.env` file in
the backend folder and add the variables used by `config/settings.py`.

### 4. Environment variables

Example values:

``` env
DJANGO_SECRET_KEY=replace-with-a-local-secret
DJANGO_DEBUG=True
DB_NAME=fine_grained_permissions
DB_USER=postgres
DB_PASSWORD=postgresql
DB_HOST=localhost
DB_PORT=5432
```

Use the exact variable names expected by your project's Django settings.
Replace the example values with your own local values. Do not commit
your real `.env` file, database password, or secret key to GitHub.

### 5. Run migrations and seed permissions

From the `backend` folder, run:

``` powershell
python manage.py migrate
python manage.py seed_functions
```

The `seed_functions` command creates the six required function
permissions.

Create an administrator account:

``` powershell
python manage.py createsuperuser
```

Start Django:

``` powershell
python manage.py runserver
```

The backend normally runs at `http://127.0.0.1:8000/`.

### 6. Set up the frontend

Open a second PowerShell terminal in the project folder:

``` powershell
cd frontend
npm install
npm run dev
```

Open the local address shown in the terminal, usually
`http://localhost:5173/`.

## Sample Credentials

For a fresh setup, create a test account through Django Admin:

1.  Open `http://127.0.0.1:8000/admin/`.
2.  Sign in with the superuser account created using `createsuperuser`.
3.  Create a normal application user and set a password.
4.  Assign the function permissions needed for testing.
5.  Use that user's email and password to log in to the React app or
    login API.

Example credentials to create locally for testing:

-   **Email:** `velmalaanjalivelmala.com`
-   **Password:** `Minny@123`

These are example values, not an account automatically created by the
application. Create the account with these values through Django Admin
before using them. If your Django Admin form requires a different
user-creation process, follow the fields provided by your configured
custom User admin.

For authorization testing, use separate accounts with different
permissions, including one account without `ASSIGN_PERMISSION`. Do not
use the Django superuser as a substitute for testing ordinary users'
function permissions.

## Postman Collection / API Documentation

Export the Postman collection as a JSON file:

1.  Open **Collections** in Postman.

2.  Find this project's collection and click its three-dot menu.

3.  Select **Export**.

4.  Choose **Collection v2.1** if available.

5.  Save the JSON file, for example:

    `docs/Fine-Grained-User-Permission-Management.postman_collection.json`

Include this file in your GitHub repository or upload it separately if
the assignment portal requests separate attachments.

Before exporting, remove real access tokens, refresh tokens, and
passwords from saved requests. Use placeholders or Postman variables
instead.

To import the collection, open Postman and select **Import**, then
choose the exported JSON file.

## Important API Behavior

-   Login with valid credentials should succeed.
-   Invalid login credentials should return `401 Unauthorized`.
-   Protected endpoints without a valid token should return
    `401 Unauthorized`.
-   An authenticated user without the required function permission
    should receive `403 Forbidden`.
-   Only users with `ASSIGN_PERMISSION` should be able to add or remove
    permissions.

## Running Backend Tests

From the `backend` folder:

``` powershell
python manage.py test
python manage.py check
```

Use the results from your own test run when reporting the test status.

## Security Notes

-   Keep `.env` out of GitHub.
-   Do not commit passwords or JWT tokens.
-   In production, use `DEBUG=False`, a secure secret key, and HTTPS.
-   The backend---not just the frontend---must enforce permissions.
