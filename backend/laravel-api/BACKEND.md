# Backend Architecture Guide

This guide explains how the Laravel backend is structured, why each layer exists, and how a request moves through the system from HTTP to database and back.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Request Lifecycle](#request-lifecycle)
3. [Folder Structure](#folder-structure)
4. [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
   - [Routes](#1-routes--routesapiphp)
   - [Form Requests (Validation)](#2-form-requests--validation)
   - [Controllers](#3-controllers)
   - [Service](#4-service--business-logic)
   - [Repository Interface](#5-repository-interface)
   - [Repository](#6-repository--data-access)
   - [Models](#7-models)
   - [Service Provider (Dependency Injection)](#8-service-provider--dependency-injection)
   - [Custom Exceptions](#9-custom-exceptions)
5. [Authentication (Sanctum)](#authentication-sanctum)
6. [Database Schema](#database-schema)
7. [Key Business Rule — 10-Second Duplicate Prevention](#key-business-rule--10-second-duplicate-prevention)
8. [Security Properties](#security-properties)
9. [Design Patterns Used](#design-patterns-used)
10. [Tests](#tests)
11. [File Reference](#file-reference)

---

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| PHP | 8.3 | Server-side language |
| Laravel | 11 | Web framework |
| Laravel Sanctum | (bundled) | API token authentication |
| SQLite | 3 | Database (zero-config for development) |
| PHPUnit | (bundled) | Automated testing |

---

## Request Lifecycle

Every HTTP request flows through these layers in order:

```
Browser / Frontend / Mobile
        │
        ▼
  routes/api.php          ← decides which controller method handles the request
        │
        ▼
  auth:sanctum middleware  ← checks Bearer token (protected routes only)
        │
        ▼
  FormRequest              ← validates the request body before the controller runs
        │
        ▼
  Controller               ← thin HTTP layer: reads input, calls service, returns response
        │
        ▼
  Service                  ← all business logic lives here
        │
        ▼
  Repository               ← all database queries live here
        │
        ▼
  Eloquent Model           ← maps PHP objects ↔ database rows
        │
        ▼
  SQLite Database
```

The response travels back up the same chain. If anything fails at any layer (e.g. validation, auth, not found), Laravel short-circuits and sends an appropriate HTTP error — the layers below it never run.

---

## Folder Structure

```
backend/laravel-api/
├── app/
│   ├── Exceptions/
│   │   └── DuplicateTaskException.php   ← custom exception for business rule
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php       ← register, login, logout
│   │   │   └── TaskController.php       ← CRUD for tasks
│   │   └── Requests/
│   │       ├── RegisterRequest.php      ← validation for POST /auth/register
│   │       ├── LoginRequest.php         ← validation for POST /auth/login
│   │       ├── StoreTaskRequest.php     ← validation for POST /tasks
│   │       └── UpdateTaskRequest.php    ← validation for PUT /tasks/{id}
│   ├── Models/
│   │   ├── User.php
│   │   └── Task.php
│   ├── Providers/
│   │   └── AppServiceProvider.php       ← binds interface → concrete class
│   ├── Repositories/
│   │   ├── Contracts/
│   │   │   └── TaskRepositoryInterface.php   ← the contract (interface)
│   │   └── TaskRepository.php               ← the implementation
│   └── Services/
│       └── TaskService.php              ← business logic
├── database/
│   ├── migrations/
│   │   ├── ..._create_users_table.php
│   │   ├── ..._create_personal_access_tokens_table.php
│   │   └── ..._create_tasks_table.php
│   └── database.sqlite                  ← the actual database file
├── routes/
│   └── api.php                          ← all API route definitions
└── tests/
    ├── Feature/TaskApiTest.php          ← end-to-end API tests
    └── Unit/TaskServiceTest.php         ← isolated service unit tests
```

---

## Layer-by-Layer Breakdown

### 1. Routes — `routes/api.php`

The router maps an HTTP method + URL to a controller method. It also applies middleware (like auth) before the controller runs.

```
Public routes (no token required):
  POST   /api/auth/register  → AuthController@register
  POST   /api/auth/login     → AuthController@login

Protected routes (auth:sanctum middleware applied to entire group):
  POST   /api/auth/logout    → AuthController@logout

  GET    /api/tasks          → TaskController@index    (list tasks)
  POST   /api/tasks          → TaskController@store    (create task)
  GET    /api/tasks/{id}     → TaskController@show     (get one task)
  PUT    /api/tasks/{id}     → TaskController@update   (update task)
  DELETE /api/tasks/{id}     → TaskController@destroy  (delete task)
```

`Route::apiResource('tasks', TaskController::class)` generates all five task routes automatically — this is Laravel's convention for REST resources.

---

### 2. Form Requests — Validation

Laravel Form Requests are classes that validate the incoming request body **before** the controller method runs. If validation fails, Laravel automatically returns a `422 Unprocessable Entity` with field-level error messages — the controller is never reached.

Each request class has:
- `authorize()` — returns `true` to allow all authenticated users (route middleware already handles auth)
- `rules()` — an array of validation rules for each field

#### `RegisterRequest`

| Field | Rules | Meaning |
|---|---|---|
| `name` | `required, string, max:255` | Must be present, text only, max 255 chars |
| `email` | `required, email, max:255, unique:users` | Must be a valid email, not already registered |
| `password` | `required, string, min:8, confirmed` | Min 8 chars; `confirmed` means `password_confirmation` must match |

#### `LoginRequest`

| Field | Rules |
|---|---|
| `email` | `required, email` |
| `password` | `required, string` |

#### `StoreTaskRequest`

| Field | Rules |
|---|---|
| `title` | `required, string, max:255` |
| `description` | `nullable, string` |
| `priority` | `nullable, in:low,medium,high` |
| `status` | `nullable, in:pending,completed` |

#### `UpdateTaskRequest`

All fields use the `sometimes` rule. This means the rule only applies **if the field is present in the request**. This enables true partial updates — you can send just `{ "status": "completed" }` without providing every other field.

| Field | Rules |
|---|---|
| `title` | `sometimes, required, string, max:255` |
| `description` | `sometimes, nullable, string` |
| `priority` | `sometimes, required, in:low,medium,high` |
| `status` | `sometimes, required, in:pending,completed` |

---

### 3. Controllers

Controllers are intentionally thin. Their only job is to:
1. Read the validated input from the request
2. Call the service
3. Return the right HTTP response

They contain no business logic and no database queries.

#### `AuthController`

**`register(RegisterRequest $request)`**
- Creates the user — password is auto-hashed by the `hashed` cast on the User model
- Calls `$user->createToken('auth-token')->plainTextToken` to generate a Sanctum token
- Returns `201 Created` with `{ user, token }`

**`login(LoginRequest $request)`**
- Finds the user by email
- Uses `Hash::check($request->password, $user->password)` to verify the password
- If wrong: returns `401 Unauthorized` with `{ message: "Invalid credentials." }`
- If correct: creates a new token and returns it with `200 OK`

**`logout(Request $request)`**
- Calls `$request->user()->currentAccessToken()->delete()`
- This deletes only the token used in this request from the `personal_access_tokens` table — other sessions are unaffected
- Returns `200 OK` with `{ message: "Logged out successfully." }`

#### `TaskController`

**`index(Request $request)`**
- Reads optional `?status=` query parameter
- Calls `$this->service->listTasks($user->id, $status)`
- Returns the paginated result as JSON

**`store(StoreTaskRequest $request)`**
- Calls `$this->service->createTask($request->validated(), $user->id)`
- Catches `DuplicateTaskException` → returns `422` with the business rule message
- Returns `201 Created` with the new task

**`show(Request $request, int $id)`**
- Calls `$this->service->getTask($id, $user->id)`
- Returns `200 OK` with the task (or `404` if it doesn't belong to the user)

**`update(UpdateTaskRequest $request, int $id)`**
- Calls `$this->service->updateTask($id, $user->id, $request->validated())`
- Returns `200 OK` with the updated task

**`destroy(Request $request, int $id)`**
- Calls `$this->service->deleteTask($id, $user->id)`
- Returns `204 No Content` (empty body — standard for successful deletes)

---

### 4. Service — Business Logic

`TaskService` is where business rules are enforced. It depends on `TaskRepositoryInterface` (not the concrete `TaskRepository`) — this is the key design decision that makes the unit tests possible.

#### Why a Service Layer?

Without it, business logic would live in the controller. Controllers would become hard to test and hard to read. The service separates the question "what should happen?" from "how do I return an HTTP response?".

#### `createTask($data, $userId)`

This is the most important method:

```php
return DB::transaction(function () use ($data, $userId) {
    if ($this->repository->existsWithTitleWithinSeconds($data['title'], $userId, 10)) {
        throw new DuplicateTaskException();
    }
    return $this->repository->create(array_merge($data, ['user_id' => $userId]));
});
```

- The `DB::transaction` wraps both the check and the insert as a single atomic operation. Without this, two simultaneous requests could both pass the duplicate check before either one creates the record — a classic race condition.
- If a duplicate is found, `DuplicateTaskException` is thrown. The controller catches it and returns a `422`.
- The `user_id` is added here (not trusted from the client) — the frontend never sends `user_id`.

All other methods (`listTasks`, `getTask`, `updateTask`, `deleteTask`) simply pass through to the repository with the `$userId` always included for scoping.

---

### 5. Repository Interface

`TaskRepositoryInterface` defines the contract — the set of methods that any task repository must implement:

```php
interface TaskRepositoryInterface
{
    public function paginate(int $userId, ?string $status, int $perPage): LengthAwarePaginator;
    public function find(int $id, int $userId): Task;
    public function create(array $data): Task;
    public function update(Task $task, array $data): Task;
    public function delete(Task $task): void;
    public function existsWithTitleWithinSeconds(string $title, int $userId, int $seconds): bool;
}
```

**Why an interface?**

The service depends on `TaskRepositoryInterface`, not `TaskRepository`. This means:
- In production: Laravel injects the real `TaskRepository` (hits SQLite)
- In unit tests: a mock is injected instead — no database needed
- If you ever swap SQLite for MySQL or Postgres, only `TaskRepository` changes — the service and tests are untouched

---

### 6. Repository — Data Access

`TaskRepository` implements the interface. Every method is user-scoped — `$userId` appears in every query's `WHERE` clause.

#### `paginate($userId, $status, $perPage = 15)`

```php
Task::where('user_id', $userId)
    ->when($status, fn($q) => $q->where('status', $status))
    ->latest()
    ->paginate($perPage);
```

`->when($status, ...)` only adds the status filter when one is provided — clean conditional query building.

#### `find($id, $userId)`

```php
Task::where('user_id', $userId)->findOrFail($id);
```

`findOrFail` throws `ModelNotFoundException` if no record matches **both** conditions. Laravel automatically converts this to a `404` response. This means user A requesting user B's task ID gets a `404` — the task doesn't exist for them. This is intentional: returning `403 Forbidden` would reveal that a task with that ID exists.

#### `create($data)`

```php
return Task::create($data)->fresh();
```

`->fresh()` reloads the record from the database after inserting. This ensures the response includes database-generated values like the default `status = 'pending'` and the actual `created_at` timestamp.

#### `update($task, $data)`

```php
$task->update($data);
return $task->fresh();
```

Same pattern — `->fresh()` returns actual stored values, not just what was passed in.

#### `existsWithTitleWithinSeconds($title, $userId, $seconds)`

```php
Task::where('user_id', $userId)
    ->where('title', $title)
    ->where('created_at', '>=', now()->subSeconds($seconds))
    ->exists();
```

Uses the composite index `(user_id, title, created_at)` on the tasks table — all three columns in the `WHERE` clause are indexed together, making this query fast.

---

### 7. Models

#### `Task`

```php
protected $fillable = ['user_id', 'title', 'description', 'status', 'priority'];
```

`$fillable` is a security whitelist — only these columns can be mass-assigned via `Task::create([...])`. Any column not listed here is ignored, which prevents a malicious client from injecting unexpected fields.

The `belongsTo(User::class)` relationship means you can do `$task->user` to get the owner.

#### `User`

The `HasApiTokens` trait (from Sanctum) adds the token methods: `createToken()`, `currentAccessToken()`, `tokens()`.

The `hashed` cast on the `password` field means assigning a plain string auto-runs it through bcrypt:

```php
$user = User::create(['password' => 'secret123']); // stored as $2y$10$...
```

No manual `Hash::make()` call needed.

The `HasFactory` trait enables `User::factory()` in tests — creating test users without going through the API.

---

### 8. Service Provider — Dependency Injection

`AppServiceProvider` binds the interface to the concrete class:

```php
public function register(): void
{
    $this->app->bind(TaskRepositoryInterface::class, TaskRepository::class);
}
```

This is what makes the whole chain work. When Laravel creates a `TaskService`, it sees that the constructor type-hints `TaskRepositoryInterface`. It looks up this binding and injects a `TaskRepository` instance automatically.

Without this binding, Laravel would throw an error because it cannot instantiate an interface.

---

### 9. Custom Exceptions

`DuplicateTaskException` extends PHP's base `Exception` class. It exists purely to give the business rule a named, self-documenting type.

Without it, the service would need to return a boolean or a special value and the controller would need to interpret it. With the exception, the flow is clear:

```
Service throws DuplicateTaskException
    → Controller catches DuplicateTaskException
    → Controller returns 422 with the message
```

---

## Authentication (Sanctum)

Laravel Sanctum provides API token authentication. The flow is:

1. **Register or login** — the API creates a token record in `personal_access_tokens` and returns the plain-text token once. It is never stored or retrievable again.
2. **Subsequent requests** — the client sends `Authorization: Bearer <token>` on every request.
3. **Sanctum middleware** — hashes the incoming token and looks it up in `personal_access_tokens`. If found: the request is authenticated and `$request->user()` is available. If not: `401 Unauthorized`.
4. **Logout** — deletes the token row. The same plain-text token will never match again.

**Why token auth instead of sessions?**
Sessions use cookies and CSRF tokens — they work well for browser-rendered apps but are awkward for mobile apps and REST clients. Tokens are stateless from the client's perspective: send the token, get data. No cookie jar, no CSRF header.

---

## Database Schema

```sql
-- Users table (ships with Laravel)
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password        TEXT NOT NULL,
    remember_token  TEXT,
    created_at      DATETIME,
    updated_at      DATETIME
);

-- Sanctum token table (installed via `php artisan install:api`)
CREATE TABLE personal_access_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tokenable   TEXT NOT NULL,   -- polymorphic: points to User
    name        TEXT NOT NULL,
    token       TEXT NOT NULL UNIQUE,   -- SHA-256 hash of the plain-text token
    abilities   TEXT,
    last_used_at DATETIME,
    expires_at  DATETIME,
    created_at  DATETIME,
    updated_at  DATETIME
);

-- Tasks table
CREATE TABLE tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',   -- enum: pending, completed
    priority    TEXT NOT NULL DEFAULT 'medium',    -- enum: low, medium, high
    created_at  DATETIME,
    updated_at  DATETIME
);

-- Composite index for the 10-second duplicate check
CREATE INDEX tasks_user_id_title_created_at_index
    ON tasks (user_id, title, created_at);
```

The `ON DELETE CASCADE` on `user_id` means deleting a user automatically deletes all their tasks at the database level — no application code needed.

---

## Key Business Rule — 10-Second Duplicate Prevention

Creating a task with the same title as one created within the last 10 seconds (for the same user) returns `422`.

**Why this rule exists:** Prevents accidental double-submissions — e.g. a user clicking "Create" twice quickly or a network retry creating a duplicate.

**How it works:**

```
POST /api/tasks { "title": "Buy milk" }
    │
    ▼ TaskController@store
    │
    ▼ TaskService@createTask (inside DB::transaction)
    │
    ├── repository.existsWithTitleWithinSeconds("Buy milk", userId, 10)
    │   └── SELECT EXISTS(
    │           SELECT 1 FROM tasks
    │           WHERE user_id = ? AND title = ? AND created_at >= NOW() - 10s
    │       )
    │
    ├── If TRUE  → throw DuplicateTaskException
    │               → controller catches it → 422 response
    │
    └── If FALSE → repository.create({ title, user_id, ... })
                    → 201 response with new task
```

The `DB::transaction` makes the check + insert atomic. Without it, two simultaneous POST requests could both pass the check before either creates the record — both would succeed when only the first should.

**What counts as a duplicate:**
- Same `title` (exact match, case-sensitive)
- Same `user_id` — two different users can create tasks with the same title
- `created_at` within the last 10 seconds

After 10 seconds, the same title can be used again.

---

## Security Properties

| Concern | Implementation |
|---|---|
| Authentication | Sanctum Bearer token checked by `auth:sanctum` middleware before any controller runs |
| User data isolation | Every repository query includes `WHERE user_id = ?` — no global `Task::find()` anywhere |
| Resource ownership leak | `findOrFail` with user scope returns `404` for wrong-user access, not `403` — doesn't reveal that the task exists |
| Race conditions | Duplicate check + insert wrapped in `DB::transaction` |
| Password storage | Laravel `hashed` cast — bcrypt, never stored in plain text |
| Mass assignment | Explicit `$fillable` arrays on every model — unlisted columns are ignored |
| Input validation | FormRequest classes validate every input before it reaches the controller |
| SQL injection | Eloquent uses prepared statements — raw values are never interpolated into queries |

---

## Design Patterns Used

### Repository Pattern
Separates "what data to fetch" (service) from "how to fetch it" (repository). The service never writes a query; the repository never makes a business decision.

### Service Layer
Centralises business logic. The controller doesn't know about the 10-second rule — it just calls `createTask()` and handles exceptions.

### Dependency Inversion (SOLID)
The service depends on `TaskRepositoryInterface`, not `TaskRepository`. High-level modules (service) don't depend on low-level modules (database queries) — both depend on the abstraction (interface). This is the D in SOLID.

### Form Request Objects
Moves validation out of controllers into dedicated classes. Each request class is single-responsibility: it knows how to validate one operation.

---

## Tests

### Feature Tests — `tests/Feature/TaskApiTest.php`

These are end-to-end tests that fire real HTTP requests against the application using an in-memory SQLite database (`:memory:`). Each test starts with a completely fresh database.

| Test | What it checks |
|---|---|
| `test_user_can_register` | `POST /auth/register` returns 201 with user + token |
| `test_user_can_login` | `POST /auth/login` returns 200 with token |
| `test_login_with_invalid_credentials_returns_401` | Wrong password → 401 |
| `test_user_can_logout` | Token is revoked; subsequent requests get 401 |
| `test_unauthenticated_request_returns_401` | No token → 401 on task routes |
| `test_authenticated_user_can_list_tasks` | `GET /tasks` returns paginated list |
| `test_user_only_sees_their_own_tasks` | User A cannot see User B's tasks |
| `test_tasks_can_be_filtered_by_status` | `?status=pending` and `?status=completed` work correctly |
| `test_user_can_create_a_task` | `POST /tasks` returns 201 with all fields |
| `test_create_task_requires_title` | Missing title → 422 with validation error |
| `test_duplicate_title_within_10_seconds_returns_422` | Same title twice fast → 422 |
| `test_duplicate_title_from_different_user_is_allowed` | Same title, different user → 201 |
| `test_user_can_update_a_task` | `PUT /tasks/{id}` updates and returns task |
| `test_user_cannot_update_another_users_task` | Wrong user → 404 |
| `test_user_can_delete_a_task` | `DELETE /tasks/{id}` → 204, row removed |
| `test_user_cannot_delete_another_users_task` | Wrong user → 404 |

### Unit Tests — `tests/Unit/TaskServiceTest.php`

These test `TaskService` in complete isolation. The repository is replaced with a mock — no database is touched. Tests run in microseconds.

| Test | What it checks |
|---|---|
| `test_create_task_throws_when_duplicate_within_10_seconds` | `DuplicateTaskException` is thrown when duplicate exists |
| `test_create_task_succeeds_when_no_duplicate` | Repository `create()` is called when no duplicate found |
| `test_create_task_calls_duplicate_check_with_correct_user_id` | Correct `userId` is passed to the duplicate check |

**Why both types?**

Feature tests catch integration problems — does the whole stack work together? Unit tests catch logic problems — does the service behave correctly given specific inputs? Unit tests also run faster and are easier to write for edge cases (mocking the repo to return `true` for the duplicate check is simpler than setting up real DB records with precise timestamps).

---

## File Reference

| File | Purpose |
|---|---|
| `routes/api.php` | All route definitions |
| `app/Http/Controllers/Api/AuthController.php` | Register, login, logout |
| `app/Http/Controllers/Api/TaskController.php` | Task CRUD |
| `app/Http/Requests/RegisterRequest.php` | Register validation |
| `app/Http/Requests/LoginRequest.php` | Login validation |
| `app/Http/Requests/StoreTaskRequest.php` | Create task validation |
| `app/Http/Requests/UpdateTaskRequest.php` | Update task validation |
| `app/Services/TaskService.php` | Business logic |
| `app/Repositories/Contracts/TaskRepositoryInterface.php` | Repository contract |
| `app/Repositories/TaskRepository.php` | Eloquent queries |
| `app/Models/User.php` | User Eloquent model |
| `app/Models/Task.php` | Task Eloquent model |
| `app/Providers/AppServiceProvider.php` | Interface → class binding |
| `app/Exceptions/DuplicateTaskException.php` | Custom exception |
| `tests/Feature/TaskApiTest.php` | End-to-end API tests |
| `tests/Unit/TaskServiceTest.php` | Isolated service tests |
| `database/migrations/` | Database schema definitions |
| `TESTING.md` | How to run tests and manually test the API |
