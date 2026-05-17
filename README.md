# Task Management System

A full-stack task management application built with **Laravel 11** (backend REST API), **Next.js 14** (web frontend), and **React Native / Expo** (mobile). Users can register, log in, and manage their personal tasks — create, view, filter, complete, and delete.

---

## Setup Instructions

### Backend (Laravel API)

**Requirements:** PHP 8.3+, Composer

```bash
cd backend/laravel-api

# Install dependencies
composer install

# Copy and configure environment
cp .env.example .env
php artisan key:generate

# Run database migrations (creates SQLite file automatically)
php artisan migrate

# Start the development server
php artisan serve
# → API available at http://localhost:8000
```

**Run the test suite:**

```bash
php artisan test
# 21 tests, 56 assertions — all passing
```

See [backend/laravel-api/TESTING.md](backend/laravel-api/TESTING.md) for full manual and automated testing instructions including curl and Postman examples.

---

### Frontend (Next.js)

> Coming soon

```bash
cd frontend/nextjs-app
npm install
cp .env.local.example .env.local
npm run dev
# → App available at http://localhost:3000
```

---

### Mobile (React Native / Expo)

> Coming soon

```bash
cd mobile/react-native-app
npm install
npx expo start
# → Scan the QR code with the Expo Go app
```

---

## Assumptions Made

- **Authentication was added** — email/password auth via Laravel Sanctum was not in the original brief but was added to make the app production-realistic and to properly scope tasks per user.
- **SQLite was chosen over MySQL/PostgreSQL** for zero-configuration local development. The schema is fully compatible with PostgreSQL for a production migration.
- **Tasks are scoped per user** — a user can only see, edit, and delete their own tasks. This was not explicitly stated but is the only secure interpretation.
- **The 10-second duplicate prevention** is enforced server-side only. The frontend shows the error message returned by the API.
- **Token storage in localStorage** (frontend) is acceptable for a development assignment. A production app would use httpOnly cookies.
- **No email verification** is implemented — registration grants immediate access.

---

## Libraries Used

### Backend

| Library | Version | Purpose |
| ------- | ------- | ------- |
| Laravel | 11 | PHP framework — routing, ORM, validation, middleware |
| Laravel Sanctum | 4.x | Token-based API authentication |
| PHPUnit | 11 | Automated testing (ships with Laravel) |

### Frontend

| Library | Version | Purpose |
| ------- | ------- | ------- |
| Next.js | 14 | React framework with App Router |
| TanStack Query | 5 | Server state management and data fetching |
| React Hook Form | 7 | Form state management |
| Zod | 3 | Schema validation (mirrors backend rules) |
| Axios | 1 | HTTP client with auth interceptor |
| Tailwind CSS | 3 | Utility-first styling |

### Mobile

| Library | Version | Purpose |
| ------- | ------- | ------- |
| Expo SDK | 51 | Managed React Native workflow |
| React Navigation | 6 | Stack-based navigation (auth vs app screens) |
| TanStack Query | 5 | Same data-fetching pattern as the web app |
| Axios | 1 | HTTP client |
| Expo SecureStore | — | Encrypted token storage on device |

---

## Architecture Decisions

### Repository / Service Pattern (Backend)

The backend is structured in three layers beyond the controller:

```text
Controller → Service → Repository → Database
```

- **Controller** — handles HTTP only (reads request, returns response). No business logic.
- **Service** (`TaskService`) — owns business rules. The 10-second duplicate prevention lives here, inside a `DB::transaction` to prevent race conditions between the check and the insert.
- **Repository** (`TaskRepository`) — the only layer that writes Eloquent queries. Swappable via `TaskRepositoryInterface`, which is what makes unit testing possible without a real database.
- **AppServiceProvider** — binds the interface to the concrete class via Laravel's service container.

### Sanctum Token-Based Auth

Chosen over session/cookie auth because:

- Tokens work identically for the web frontend and the mobile app
- No CSRF token setup needed
- Simpler CORS configuration

### SQLite for Development

Zero configuration — no database server to install or run. The single file (`database/database.sqlite`) is created automatically on first migrate. The schema is standard SQL and will work with PostgreSQL in production with no changes.

### TanStack Query on Both Web and Mobile

The same data-fetching pattern (`useTasks`, `useAuth` hooks) is used on both platforms. This consistency means less mental overhead when switching between codebases and the cache-per-filter pattern (`queryKey: ['tasks', status]`) works identically.

### User-Scoped Queries

Every database query in `TaskRepository` includes `where('user_id', $userId)`. This means even if a user somehow guesses another task's ID, the query returns 404 — not 403 — which avoids leaking whether the resource exists.

---

## What You Would Improve With More Time

- **Move to PostgreSQL** for production — better performance, full-text search, and proper enum types.
- **Add email verification** on registration before granting access.
- **Replace localStorage with httpOnly cookies** on the frontend for more secure token storage.
- **Optimistic UI updates** — mark a task complete instantly in the UI before the API responds, with a rollback on failure.
- **Offline support on mobile** — use TanStack Query's `persistQueryClient` with AsyncStorage so tasks load without a network connection.
- **Pagination UI** on the frontend — the API already supports it (`?page=2`), but the frontend currently loads page 1 only.
- **Task due dates** — an obvious missing field for a real task manager.
- **End-to-end tests** with Playwright (web) and Detox (mobile) to complement the existing PHPUnit suite.
- **CI/CD pipeline** — GitHub Actions to run `php artisan test` on every pull request.
- **Docker Compose** for a fully reproducible local environment across team members.
