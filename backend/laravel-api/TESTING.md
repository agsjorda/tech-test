# Backend Testing Guide

This guide covers two ways to test the backend:
1. **Automated tests** — PHPUnit test suite (fastest, run these first)
2. **Manual testing** — curl commands or Postman (good for exploring the API)

---

## Prerequisites

Make sure the server is set up before testing:

```bash
cd backend/laravel-api

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Create the SQLite database file and run migrations
php artisan migrate

# Start the development server (keep this running in a separate terminal)
php artisan serve
```

The API will be available at `http://localhost:8000`.

---

## 1. Automated Tests (PHPUnit)

Run the full test suite with a single command:

```bash
cd backend/laravel-api
php artisan test
```

Expected output: **21 tests, 56 assertions — all passing.**

The tests use an in-memory SQLite database (`:memory:`) configured in `phpunit.xml`.  
This means:
- Tests are completely isolated from your real database
- Each test starts with a fresh, empty database (via `RefreshDatabase`)
- The full suite runs in under 1 second

### What the tests cover

#### Feature Tests (`tests/Feature/TaskApiTest.php`)

| Test | What it verifies |
|------|-----------------|
| `test_user_can_register` | POST /api/auth/register returns 201 with user + token |
| `test_user_can_login` | POST /api/auth/login returns 200 with token |
| `test_login_with_invalid_credentials_returns_401` | Wrong password → 401 |
| `test_user_can_logout` | POST /api/auth/logout revokes the token |
| `test_unauthenticated_request_returns_401` | No token → 401 on task routes |
| `test_authenticated_user_can_list_tasks` | GET /api/tasks returns paginated list |
| `test_user_only_sees_their_own_tasks` | User A cannot see User B's tasks |
| `test_tasks_can_be_filtered_by_status` | ?status=pending and ?status=completed work correctly |
| `test_user_can_create_a_task` | POST /api/tasks returns 201 with all fields |
| `test_create_task_requires_title` | Missing title → 422 with validation error |
| `test_duplicate_title_within_10_seconds_returns_422` | Same title twice fast → 422 |
| `test_duplicate_title_from_different_user_is_allowed` | Same title, different user → 201 |
| `test_user_can_update_a_task` | PUT /api/tasks/{id} updates and returns the task |
| `test_user_cannot_update_another_users_task` | Updating someone else's task → 404 |
| `test_user_can_delete_a_task` | DELETE /api/tasks/{id} → 204, row removed |
| `test_user_cannot_delete_another_users_task` | Deleting someone else's task → 404 |

#### Unit Tests (`tests/Unit/TaskServiceTest.php`)

| Test | What it verifies |
|------|-----------------|
| `test_create_task_throws_when_duplicate_within_10_seconds` | `DuplicateTaskException` is thrown when a duplicate exists |
| `test_create_task_succeeds_when_no_duplicate` | Repository `create()` is called when no duplicate found |
| `test_create_task_calls_duplicate_check_with_correct_user_id` | The correct `userId` is passed to the duplicate check |

### Run only one test suite

```bash
# Feature tests only
php artisan test --testsuite=Feature

# Unit tests only
php artisan test --testsuite=Unit
```

### Run a single test

```bash
php artisan test --filter test_duplicate_title_within_10_seconds_returns_422
```

---

## 2. Manual Testing with Postman

If you prefer a GUI, import these steps into Postman. Set the base URL to `http://localhost:8000`.

> **Tip:** In Postman, save the token from the login/register response as a Collection Variable called `token`. Then use `{{token}}` in the Authorization header for all protected routes.

---

### Step 1 — Register a new user

```
POST http://localhost:8000/api/auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123"
}
```

**Expected response (201):**
```json
{
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
    },
    "token": "1|abc123..."
}
```
Copy the `token` value — you'll need it for all task requests.

---

### Step 2 — Login

```
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "password123"
}
```

**Expected response (200):** Same structure as register.

**Test invalid credentials:**
```json
{ "email": "john@example.com", "password": "wrongpassword" }
```
Expected: `401 { "message": "Invalid credentials." }`

---

### Step 3 — Create a task

```
POST http://localhost:8000/api/tasks
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "priority": "high"
}
```

**Expected response (201):**
```json
{
    "id": 1,
    "user_id": 1,
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "status": "pending",
    "priority": "high",
    "created_at": "2026-05-17T10:00:00.000000Z",
    "updated_at": "2026-05-17T10:00:00.000000Z"
}
```

**Test validation — missing title:**
```json
{ "description": "No title here" }
```
Expected: `422 { "errors": { "title": ["The title field is required."] } }`

---

### Step 4 — Test the 10-second duplicate rule

Send this request **twice within 10 seconds** (same title, same user):

```
POST http://localhost:8000/api/tasks
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{ "title": "Duplicate test" }
```

- **First request:** `201 Created` ✅
- **Second request (within 10s):** `422 { "message": "A task with this title was created less than 10 seconds ago." }` ✅
- **After 10 seconds:** `201 Created` again ✅

---

### Step 5 — List tasks

```
GET http://localhost:8000/api/tasks
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected response (200):**
```json
{
    "current_page": 1,
    "data": [ { ...task }, { ...task } ],
    "per_page": 15,
    "total": 2,
    "last_page": 1
}
```

**Filter by status:**
```
GET http://localhost:8000/api/tasks?status=pending
GET http://localhost:8000/api/tasks?status=completed
```

---

### Step 6 — Get a single task

```
GET http://localhost:8000/api/tasks/1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Test accessing another user's task:**  
Register a second user, get their token, then try to GET a task that belongs to user 1.  
Expected: `404`

---

### Step 7 — Mark a task as completed

```
PUT http://localhost:8000/api/tasks/1
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
    "status": "completed"
}
```

**Expected response (200):** The task object with `"status": "completed"`.

You can also update other fields or multiple fields at once:
```json
{
    "title": "Updated title",
    "priority": "low",
    "status": "completed"
}
```

---

### Step 8 — Delete a task

```
DELETE http://localhost:8000/api/tasks/1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected response:** `204 No Content` (empty body)

Try getting the deleted task:
```
GET http://localhost:8000/api/tasks/1
```
Expected: `404`

---

### Step 9 — Logout

```
POST http://localhost:8000/api/auth/logout
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected response (200):** `{ "message": "Logged out successfully." }`

Now try using the same token again:
```
GET http://localhost:8000/api/tasks
Authorization: Bearer YOUR_TOKEN_HERE
```
Expected: `401 Unauthorized` — the token no longer works.

---

## 3. Manual Testing with curl

If you prefer the terminal, here are the same steps as curl commands.

> Replace `YOUR_TOKEN` with the token from the register or login response.

```bash
# Register
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"password123","password_confirmation":"password123"}' | jq

# Login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"password123"}' | jq

# Create a task
curl -s -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","priority":"high"}' | jq

# List tasks
curl -s http://localhost:8000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Filter by status
curl -s "http://localhost:8000/api/tasks?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Mark as completed
curl -s -X PUT http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}' | jq

# Delete a task
curl -s -X DELETE http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Logout
curl -s -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

> `jq` formats the JSON output nicely. Install it with `brew install jq` (Mac) or `choco install jq` (Windows). It's optional — the commands work without it.

---

## Quick Reference — All Endpoints

| Method | URL | Auth required | Description |
|--------|-----|:---:|-------------|
| POST | `/api/auth/register` | No | Create account, returns token |
| POST | `/api/auth/login` | No | Login, returns token |
| POST | `/api/auth/logout` | Yes | Revoke current token |
| GET | `/api/tasks` | Yes | List tasks (paginated) |
| GET | `/api/tasks?status=pending` | Yes | Filter by status |
| POST | `/api/tasks` | Yes | Create a task |
| GET | `/api/tasks/{id}` | Yes | Get one task |
| PUT | `/api/tasks/{id}` | Yes | Update a task |
| DELETE | `/api/tasks/{id}` | Yes | Delete a task |
