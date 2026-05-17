# Frontend Architecture & How It Works

This document explains how the Next.js frontend is structured, how data flows through the app,
and how key concepts like component lifecycle and TanStack Query work in practice.
Written to be understandable for someone new to React or Next.js.

---

## Table of Contents

1. [Tech Stack Overview](#tech-stack-overview)
2. [Folder Structure](#folder-structure)
3. [How a Page Renders (Request Lifecycle)](#how-a-page-renders-request-lifecycle)
4. [Server Components vs Client Components](#server-components-vs-client-components)
5. [Component Lifecycle](#component-lifecycle)
6. [TanStack Query — How Server State Works](#tanstack-query--how-server-state-works)
7. [Authentication Flow](#authentication-flow)
8. [Route Protection (Middleware)](#route-protection-middleware)
9. [Form Validation Flow](#form-validation-flow)
10. [Data Flow Diagram](#data-flow-diagram)
11. [File-by-File Walkthrough](#file-by-file-walkthrough)

---

## Tech Stack Overview

| Tool | What it does |
|---|---|
| **Next.js 14 (App Router)** | The React framework — handles routing, rendering, and the server layer |
| **TypeScript** | Adds static types to JavaScript so mistakes are caught before runtime |
| **Tailwind CSS** | Utility-first CSS — styles are class names on the element, no separate `.css` files |
| **TanStack Query v5** | Manages all data fetched from the API (caching, loading, refetching) |
| **React Hook Form** | Manages form inputs and submission without `useState` for every field |
| **Zod** | Schema-based validation — defines the shape and rules for form data |
| **Axios** | HTTP client for making requests to the Laravel API |

---

## Folder Structure

```
src/
├── app/                      # Next.js App Router — each folder is a URL route
│   ├── layout.tsx            # Root layout — wraps every page with Providers
│   ├── page.tsx              # / — redirects to /tasks
│   ├── login/page.tsx        # /login
│   ├── register/page.tsx     # /register
│   └── tasks/
│       ├── page.tsx          # /tasks — main task list
│       └── create/page.tsx   # /tasks/create — new task form
│
├── components/               # Reusable UI pieces (not pages themselves)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx      # The full /tasks page component
│   │   ├── TaskCard.tsx      # One task row/card
│   │   ├── TaskFilters.tsx   # All / Pending / Completed filter buttons
│   │   └── CreateTaskForm.tsx
│   └── ui/
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
│
├── hooks/                    # Custom React hooks — encapsulate API logic
│   ├── useAuth.ts            # login, register, logout mutations
│   └── useTasks.ts           # fetch, create, update, delete tasks
│
├── lib/                      # Non-React utilities
│   ├── api.ts                # Pre-configured Axios instance
│   └── schemas.ts            # Zod validation schemas
│
├── types/
│   └── index.ts              # Shared TypeScript interfaces (Task, User, etc.)
│
└── middleware.ts             # Route protection — runs before every request
```

---

## How a Page Renders (Request Lifecycle)

Here is what happens from the moment a user visits `/tasks` in their browser:

```
Browser → GET /tasks
    ↓
Next.js Middleware (middleware.ts)
    - Reads the `token` cookie
    - If no token → redirect to /login
    - If token exists → continue
    ↓
Next.js renders app/tasks/page.tsx (Server Component)
    - This is just: return <TaskList />
    ↓
TaskList component mounts in the browser (Client Component)
    - TanStack Query runs useTasks() → GET /api/tasks
    - While waiting: isLoading = true → shows <LoadingSpinner />
    - On success: isLoading = false, data arrives → renders <TaskCard /> for each task
    - On error: isError = true → shows <ErrorMessage />
```

The key insight: **the page file is a server component** (tiny, just renders a component),
and **the component with data fetching is a client component** (marked with `'use client'`).

---

## Server Components vs Client Components

Next.js 14 has two kinds of components. This distinction matters.

### Server Components (default)
- Run on the server (or at build time)
- Cannot use `useState`, `useEffect`, or browser APIs (no `window`, `localStorage`)
- Cannot use TanStack Query hooks
- **Example**: `app/tasks/page.tsx`

```tsx
// This is a server component — no 'use client' directive
// It runs on the server and just hands off to a client component
import { TaskList } from '@/components/tasks/TaskList';

export default function TasksPage() {
  return <TaskList />;
}
```

### Client Components
- Run in the browser
- Can use `useState`, `useEffect`, hooks, `localStorage`, event handlers
- Must have `'use client'` at the very top of the file
- **Example**: `components/tasks/TaskList.tsx`, every form component

```tsx
'use client'; // ← this line makes it a client component

import { useState } from 'react';
// ... rest of the component
```

**Rule of thumb**: push `'use client'` as deep in the component tree as possible.
Keep parent/layout components as server components for better performance.

---

## Component Lifecycle

React components go through three lifecycle phases: **mount**, **update**, and **unmount**.
In modern React (hooks), these are handled by `useState` and `useEffect`.

### Mount
Happens when a component first appears on screen.

- TanStack Query's `useQuery` fires its `queryFn` (the API call) on mount
- `isLoading` is `true` until the first response arrives
- The component renders with `tasks = []` (the default) then re-renders with real data

### Update
Happens when state or props change, causing a re-render.

Examples in this app:
- User clicks "Pending" filter → `statusFilter` state changes → `useTasks('pending')` is called →
  TanStack Query fetches with `?status=pending` → component re-renders with filtered tasks
- User marks a task complete → `useUpdateTask` mutation fires → on success,
  `invalidateQueries(['tasks'])` marks the cache as stale → `useTasks` refetches →
  component re-renders with updated task data

### Unmount
Happens when a component leaves the screen (e.g. navigating away).

- TanStack Query keeps the data in its cache for `staleTime` (30 seconds in this app)
- If the user navigates back within 30 seconds, no new API request is made — cached data is shown instantly
- After 30 seconds the cache entry is marked "stale" and the next visit triggers a fresh fetch

### Visualising a filter change

```
User clicks "Pending"
    ↓
setStatusFilter('pending')  ← useState setter — triggers a re-render
    ↓
TaskList re-renders
    ↓
useTasks('pending') is called with new queryKey ['tasks', 'pending']
    ↓
TanStack Query checks cache:
    - Cache hit (fetched recently)? → return cached data immediately, no spinner
    - Cache miss / stale? → set isLoading=true, fetch GET /api/tasks?status=pending
    ↓
Data arrives → isLoading=false, tasks re-renders with filtered results
```

---

## TanStack Query — How Server State Works

TanStack Query separates **server state** (data that lives on the server and must be fetched)
from **client state** (UI state like "which filter is active", managed by `useState`).

### The Core Concepts

#### queryKey — the cache identifier
Every `useQuery` call has a `queryKey`. Think of it like a cache key in a database.

```ts
// These are THREE separate cache entries — each has its own data and fetch status
useQuery({ queryKey: ['tasks', 'all'] })       // ← all tasks
useQuery({ queryKey: ['tasks', 'pending'] })   // ← pending tasks only
useQuery({ queryKey: ['tasks', 'completed'] }) // ← completed tasks only
```

If two components on the same page call `useTasks('pending')`, they share one cache entry
and make only one API request — not two.

#### queryFn — the fetcher
The async function that actually calls the API. TanStack Query calls this for you
and manages the Promise — you never write `.then()` or `.catch()` in the component.

```ts
queryFn: () => api.get('/tasks', { params: { status: 'pending' } }).then(r => r.data)
```

#### isLoading, isError, data — the state flags
TanStack Query gives you these automatically. No `useState(false)` / `useState(null)` needed.

```tsx
const { data, isLoading, isError } = useTasks(statusFilter);

if (isLoading) return <LoadingSpinner />;
if (isError)   return <ErrorMessage />;
return <TaskList tasks={data.data} />;
```

### useMutation — for writes (POST / PUT / DELETE)

`useMutation` is the sibling of `useQuery` but for data changes.

```ts
const createTask = useCreateTask();

// Trigger the mutation from an event handler
createTask.mutate({ title: 'Buy milk', priority: 'low' });

// Check state
createTask.isPending  // true while the POST is in flight
createTask.error      // the Axios error if it failed
createTask.isSuccess  // true after it succeeded
```

### invalidateQueries — how the list stays fresh after a write

When you create, update, or delete a task, the cached list is now out of date.
`invalidateQueries` tells TanStack Query to mark those cache entries as stale
and refetch them immediately.

```ts
// Inside useCreateTask:
onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
//                                                 ↑
//                         The prefix ['tasks'] matches ALL task cache entries
//                         (['tasks','all'], ['tasks','pending'], ['tasks','completed'])
//                         so every filter refreshes, not just the current one
```

Without this, creating a task while on the "Pending" filter would not show it
in "All" until the user refreshed the page.

### The cache lifecycle

```
First visit to /tasks
    → no cache entry → queryFn fires → data stored in cache
    → marked "fresh" for 30 seconds (staleTime)

Navigate away and back (within 30s)
    → cache hit, still fresh → data returned instantly → no spinner
    → queryFn does NOT fire again

Navigate away and back (after 30s)
    → cache hit, but STALE → cached data shown immediately (no blank screen)
    → queryFn fires in the background → data updates when response arrives

Task created / updated / deleted
    → invalidateQueries(['tasks']) → entries marked stale
    → queryFn fires immediately → list updates
```

---

## Authentication Flow

### Login

```
1. User submits LoginForm
2. Zod validates email + password (client-side, instant)
3. If invalid → show field errors, stop here
4. If valid → login.mutate(data) → POST /api/auth/login
5a. 200 OK → response: { user, token }
       → persistToken(token):
           localStorage.setItem('token', token)       ← for Axios interceptor
           document.cookie = `token=${token}; ...`    ← for Next.js middleware
       → router.push('/tasks')
5b. 401 → login.error is set → apiError extracted → shown as red banner
```

### Why two storage locations?

| Storage | Who reads it | Used for |
|---|---|---|
| `localStorage` | Axios request interceptor (browser only) | Attaching `Authorization: Bearer <token>` to every API request |
| Cookie | Next.js middleware (server edge runtime) | Checking auth before the page is sent to the browser |

Next.js middleware runs **before** the browser receives any HTML. It can only read
cookies — not `localStorage` (which is browser-only). So we mirror the token to a
cookie on login to enable server-side route protection.

### Logout

```
1. User clicks "Sign out"
2. logout.mutate() → POST /api/auth/logout (tells Laravel to delete the token from DB)
3. onSettled (runs whether success or failure):
       clearToken() → removes from localStorage + expires cookie
       queryClient.clear() → wipes all cached data (so next user sees nothing)
       router.push('/login')
```

`onSettled` (not `onSuccess`) is used here so the user is always logged out locally
even if the network is down or the token was already expired on the server.

---

## Route Protection (Middleware)

`src/middleware.ts` is a special Next.js file that runs on the server **Edge runtime**
before every matching request. It does not have access to React or the DOM.

```
Request arrives for /tasks/create
    ↓
middleware.ts runs
    ↓
Reads cookies from the request headers
    ↓
token cookie present?
    YES → NextResponse.next() → page renders normally
    NO  → NextResponse.redirect('/login') → user never sees the page
```

The `matcher` config at the bottom of the file tells Next.js which routes to run
the middleware on. Without it, middleware would run on every single request
(including `/_next/static/...` asset requests), which is wasteful.

```ts
export const config = {
  matcher: ['/tasks/:path*', '/login', '/register'],
};
```

`/tasks/:path*` matches `/tasks`, `/tasks/create`, `/tasks/123`, etc.

---

## Form Validation Flow

Both forms use **React Hook Form** + **Zod** together.

### Without RHF + Zod (the old way)
```tsx
// Managing form state manually — gets messy fast
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');

function handleSubmit() {
  if (!email.includes('@')) setEmailError('Invalid email');
  // ... and so on for every field
}
```

### With RHF + Zod (our way)
```tsx
// RHF tracks all field values internally — no useState per field
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema), // hand validation to Zod
});

// register() returns props (onChange, onBlur, ref, name) — spread onto the input
<input {...register('email')} />
// errors.email.message is set by Zod automatically when the field is invalid
{errors.email && <p>{errors.email.message}</p>}
```

### Validation sequence on submit

```
User clicks Submit
    ↓
handleSubmit() intercepts the native form submit event
    ↓
zodResolver runs the Zod schema against all current field values
    ↓
Zod finds errors?
    YES → set errors object → component re-renders with error messages → stop
    NO  → call our onSubmit(data) with the typed, validated data object
    ↓
onSubmit calls mutation.mutate(data) → API request fires
```

The benefit: by the time our `onSubmit` is called, **TypeScript knows the exact shape
of `data`** — no casting, no checking for undefined.

---

## Data Flow Diagram

```
                          ┌─────────────────────┐
                          │   Next.js Middleware  │
                          │   (middleware.ts)     │
                          │   Reads token cookie  │
                          │   Redirects if unauth │
                          └──────────┬────────────┘
                                     │ request allowed
                                     ▼
                          ┌─────────────────────┐
                          │   app/tasks/page.tsx  │
                          │   (Server Component)  │
                          │   Renders <TaskList>  │
                          └──────────┬────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────┐
│                  TaskList (Client Component)                │
│                                                            │
│  useState(statusFilter)  ──────────────────────────────┐   │
│         │                                              │   │
│         ▼                                              ▼   │
│  useTasks(statusFilter)                         TaskFilters │
│         │                                              │   │
│         │  queryKey: ['tasks', statusFilter]           │   │
│         │                                              │   │
│         ▼                                              │   │
│  TanStack Query Cache ◄────────────────────────────────┘   │
│         │                                                  │
│         │  Cache miss / stale? → fires queryFn             │
│         ▼                                                  │
│    Axios (lib/api.ts)                                       │
│         │  Attaches Bearer token from localStorage          │
│         ▼                                                  │
│    GET /api/tasks?status=...                               │
│         │                                                  │
│         ▼                                                  │
│    Laravel API (port 8000)                                 │
│         │  Returns { data: Task[], total, ... }            │
│         ▼                                                  │
│    TanStack Query stores response in cache                 │
│         │  isLoading=false, data=response                  │
│         ▼                                                  │
│    TaskCard × N  ──── useUpdateTask ──── PUT /api/tasks/id │
│                  ──── useDeleteTask ──── DELETE /api/tasks/id│
│                                                            │
│    + New task link → /tasks/create → CreateTaskForm        │
│                       POST /api/tasks                      │
│                       onSuccess → invalidateQueries        │
│                       → redirect to /tasks                 │
└────────────────────────────────────────────────────────────┘
```

---

## File-by-File Walkthrough

### `src/types/index.ts`
TypeScript interfaces that mirror the JSON the Laravel API returns. Every API response
is typed here so TypeScript can catch mismatches between what we expect and what we get.

### `src/lib/api.ts`
A pre-configured Axios instance. Two interceptors are attached:
- **Request**: reads the token from `localStorage`, adds `Authorization: Bearer <token>`
- **Response**: if the server returns 401, clears the token and redirects to `/login`

All components import `api` from here — there is only one Axios instance in the app.

### `src/lib/schemas.ts`
Zod schemas for login, register, and task creation. Schemas serve two purposes:
1. Runtime validation (Zod checks the data)
2. TypeScript types (inferred via `z.infer<typeof schema>`) — no duplicate interface needed

### `src/app/providers.tsx`
Wraps the entire app with `QueryClientProvider`. The `QueryClient` (the TanStack Query
store/cache) is created here once and shared to every component via React Context.
Must be a client component because `QueryClientProvider` uses React Context under the hood.

### `src/middleware.ts`
Runs on the Edge runtime before each request. Reads the `token` cookie and redirects:
- Unauthenticated user → `/tasks` → redirects to `/login`
- Authenticated user → `/login` or `/register` → redirects to `/tasks`

### `src/hooks/useAuth.ts`
Three mutations: `useLogin`, `useRegister`, `useLogout`.
- Saves/clears the token in both `localStorage` and a cookie
- Navigates using `useRouter` on success/settled

### `src/hooks/useTasks.ts`
All task CRUD operations as TanStack Query hooks:
- `useTasks(status?)` — `useQuery` for reading; per-filter cache entries
- `useCreateTask` / `useUpdateTask` / `useDeleteTask` — `useMutation` for writes;
  all call `invalidateQueries(['tasks'])` on success to keep the list fresh

### `src/components/tasks/TaskList.tsx`
The main page component for `/tasks`. Owns `statusFilter` state (the current filter).
Passes it to `TaskFilters` (to know which button to highlight) and to `useTasks`
(to fetch the right data). Renders different UI based on `isLoading` / `isError` / empty state.

### `src/components/tasks/TaskCard.tsx`
A single task card. Calls `useUpdateTask` and `useDeleteTask` directly — it doesn't
need the parent to pass callbacks down. After each mutation, TanStack Query's cache
invalidation causes `TaskList` to refetch and re-render automatically.

### `src/components/tasks/TaskFilters.tsx`
A "controlled component" — it has no internal state. The parent (`TaskList`) owns the
active filter and passes it in; `TaskFilters` just calls `onChange` when a button is clicked.
This is called "lifting state up": state lives in the lowest common ancestor that needs it.

### `src/components/tasks/CreateTaskForm.tsx`
Uses React Hook Form + Zod for the new-task form. On success the mutation receives
an `onSuccess` callback inline (not in the hook) so it can call `router.push('/tasks')`
from within the component where the router is available.

### `src/components/auth/LoginForm.tsx` / `RegisterForm.tsx`
Standard RHF + Zod forms. Both extract the API error from `login.error` / `register_.error`
(which is typed as `Error | null`) by narrowing it to the Axios response shape
(`'response' in error`) before reading `error.response.data.message`.
