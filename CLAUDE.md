# Task Management System — Claude Code Context

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 11, PHP 8.3, SQLite |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Mobile | Expo SDK (managed workflow), React Native, TypeScript |

## Auth

- **Mechanism**: Laravel Sanctum, token-based (Bearer tokens)
- **Frontend**: Token stored in `localStorage` + mirrored to cookie for Next.js middleware
- **Mobile**: Token stored in `expo-secure-store` (encrypted)
- **Routes**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- All `/api/tasks` routes require `Authorization: Bearer <token>`

## Database

- SQLite (`backend/laravel-api/database/database.sqlite`)
- Tasks are scoped to the authenticated user via `user_id` FK with `cascadeOnDelete`
- Composite index on `(user_id, title, created_at)` supports the duplicate-check query

## Key Business Rule

**10-second duplicate title prevention**: Creating a task with the same title as one created within the last 10 seconds (for the same user) returns HTTP 422. Enforced in `TaskService::createTask` inside a `DB::transaction` to prevent race conditions.

## Architecture Pattern

- **Repository + Service**: `TaskRepositoryInterface` → `TaskRepository` (data access) → `TaskService` (business logic) → `TaskController` (HTTP layer)
- Interface is bound in `AppServiceProvider`
- Controllers inject `TaskService`, never touch the DB directly

## Environment Variables

| App | Key | Example |
|-----|-----|---------|
| Backend | `APP_URL` | `http://localhost:8000` |
| Frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` |
| Mobile | `EXPO_PUBLIC_API_URL` | `http://localhost:8000/api` |

## Running the Apps

```bash
# Backend
cd backend/laravel-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve   # → http://localhost:8000

# Frontend
cd frontend/nextjs-app
npm install
cp .env.local.example .env.local
npm run dev         # → http://localhost:3000

# Mobile
cd mobile/react-native-app
npm install
npx expo start      # scan QR with Expo Go
```

## Running Tests

```bash
cd backend/laravel-api
php artisan test
```

Tests use SQLite `:memory:` (configured in `phpunit.xml`) — millisecond execution.

## Project Structure

```
tech-test/
├── backend/laravel-api/
│   ├── app/Http/Controllers/Api/   AuthController, TaskController
│   ├── app/Http/Requests/          RegisterRequest, LoginRequest, StoreTaskRequest, UpdateTaskRequest
│   ├── app/Models/                 User (HasApiTokens), Task
│   ├── app/Repositories/           TaskRepositoryInterface, TaskRepository
│   ├── app/Services/               TaskService
│   └── tests/Feature+Unit/
├── frontend/nextjs-app/src/
│   ├── app/                        login, register, tasks, tasks/create pages
│   ├── components/auth+tasks/
│   ├── hooks/                      useAuth, useTasks (TanStack Query)
│   └── lib/                        api.ts (Axios), schemas.ts (Zod)
└── mobile/react-native-app/src/
    ├── screens/                    LoginScreen, TaskListScreen
    ├── navigation/                 AppNavigator (auth stack vs app stack)
    ├── hooks/                      useAuth, useTasks
    └── lib/                        api.ts (Axios + SecureStore)
```
