# Mobile App — How It Works

This guide explains the mobile app from top to bottom. It is written for someone who understands basic JavaScript and React but is new to React Native, Expo, and mobile app architecture.

---

## Table of Contents

1. [What the app does](#what-the-app-does)
2. [Technology choices](#technology-choices)
3. [How the app starts up](#how-the-app-starts-up)
4. [Navigation — how screens switch](#navigation--how-screens-switch)
5. [The auth state bridge — solving a tricky problem](#the-auth-state-bridge--solving-a-tricky-problem)
6. [Talking to the backend — the API client](#talking-to-the-backend--the-api-client)
7. [Token storage — why SecureStore](#token-storage--why-securestore)
8. [The token bridge problem and how we solved it](#the-token-bridge-problem-and-how-we-solved-it)
9. [Authentication — login, register, logout](#authentication--login-register-logout)
10. [Task data — TanStack Query hooks](#task-data--tanstack-query-hooks)
11. [Screens walkthrough](#screens-walkthrough)
12. [Components](#components)
13. [Data flow diagram](#data-flow-diagram)
14. [File reference](#file-reference)

---

## What the app does

The mobile app is a task manager built with React Native and Expo. Users can:

- Register a new account or log in to an existing one
- View their personal task list
- Filter tasks by status (All / Pending / Completed)
- Pull down to refresh the list
- Create a new task (title, description, priority)
- Mark a task as complete or undo it
- Delete a task
- Log out

All data is stored on the Laravel backend — the mobile app is just a client that talks to it over HTTP.

---

## Technology choices

| Technology | What it does |
|---|---|
| **React Native** | Lets you write mobile apps in JavaScript/TypeScript using React. Renders actual native UI components, not a web view. |
| **Expo** | A toolkit on top of React Native that handles the build process, camera, secure storage, and more — without needing to write native (Swift/Kotlin) code. |
| **TypeScript** | Adds types to JavaScript so you catch mistakes at compile time rather than at runtime on a user's phone. |
| **Axios** | HTTP client for making API requests. Same library used in the web frontend. |
| **TanStack Query** | Manages server state — caching, loading/error states, background refetching, and cache invalidation. Same library used in the web frontend. |
| **expo-secure-store** | Encrypted key-value storage on the device. Used to persist the auth token between app restarts. |
| **React Navigation** | The standard navigation library for React Native — handles moving between screens and managing the back stack. |

---

## How the app starts up

Everything begins in `App.tsx`:

```tsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AppNavigator />
    </QueryClientProvider>
  );
}
```

**Step by step:**

1. `QueryClientProvider` wraps the entire app. This is a React context that makes TanStack Query available to every screen and hook. Without this wrapper, no screen could call `useQuery` or `useMutation`.

2. `AppNavigator` is mounted. This is where the app decides which screens to show.

Think of `App.tsx` as the app's outer shell — it sets up the global tools (data fetching) and then hands off to the navigator.

---

## Navigation — how screens switch

The app uses **stack navigation**, which works like a pile of screens. When you go to a new screen it gets placed on top of the pile. When you go back, the top screen is removed.

There are two separate stacks:

```
Auth Stack (shown when NOT logged in)
├── LoginScreen
└── RegisterScreen

App Stack (shown when logged in)
├── TaskListScreen
└── CreateTaskScreen
```

`AppNavigator` decides which stack to show based on whether a token exists:

```tsx
return (
  <NavigationContainer>
    {isLoggedIn ? (
      <AppStack.Navigator>...</AppStack.Navigator>
    ) : (
      <AuthStack.Navigator>...</AuthStack.Navigator>
    )}
  </NavigationContainer>
);
```

**On first load**, `AppNavigator` reads from `SecureStore` (the encrypted storage on the device) to check if a token was saved from a previous session:

```tsx
useEffect(() => {
  SecureStore.getItemAsync('token').then((token) => {
    if (token) {
      setToken(token);       // put it in the Axios interceptor
      setIsLoggedIn(true);   // show the app stack
    } else {
      setIsLoggedIn(false);  // show the auth stack
    }
  });
}, []);
```

This is why the app stays logged in after you close and reopen it — the token is saved on the device, and the navigator reads it on every startup.

**When `isLoggedIn` is `null`** (still checking SecureStore), the navigator renders nothing. This prevents a flash of the wrong stack (e.g. login screen appearing for a split second before the app stack loads).

---

## The auth state bridge — solving a tricky problem

After the user logs in, the navigator needs to switch from the auth stack to the app stack. But there's a problem: `useAuth` (the hook that handles login) needs to trigger a state change inside `AppNavigator`. How?

The naive solution is for `useAuth` to import `AppNavigator` and call something on it. But `AppNavigator` already imports `LoginScreen`, and `LoginScreen` already uses `useAuth`. That creates a **circular dependency**:

```
AppNavigator → LoginScreen → useAuth → AppNavigator  ← PROBLEM
```

React Native warns about this and it can cause bugs where things are `undefined` when they shouldn't be.

**The fix:** A neutral middle file — `src/lib/authState.ts`.

```
AppNavigator  →  authState  ←  useAuth
```

Neither file imports the other. They both only import `authState`.

`authState.ts` holds a reference to `AppNavigator`'s `setIsLoggedIn` function:

```ts
let _setIsLoggedIn: ((v: boolean) => void) | null = null;

export function registerAuthSetter(setter: (v: boolean) => void) {
  _setIsLoggedIn = setter;
}

export function notifyAuthChange(loggedIn: boolean) {
  _setIsLoggedIn?.(loggedIn);
}
```

- `AppNavigator` calls `registerAuthSetter(setIsLoggedIn)` on every render, keeping the reference fresh.
- `useAuth` calls `notifyAuthChange(true)` after login, which calls `setIsLoggedIn(true)` inside `AppNavigator`, switching to the app stack.

---

## Talking to the backend — the API client

`src/lib/api.ts` creates a single Axios instance that all screens and hooks use:

```ts
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
```

The `EXPO_PUBLIC_API_URL` environment variable is set in the `.env` file:
- On a simulator: `http://localhost:8000/api`
- On a physical device: `http://192.168.x.x:8000/api` (your machine's local IP)

The `EXPO_PUBLIC_` prefix is required by Expo to expose environment variables to the JavaScript bundle. Variables without this prefix are not available in app code.

A **request interceptor** runs before every HTTP request and attaches the auth token:

```ts
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});
```

This means every hook and screen that calls `api.get()`, `api.post()`, etc. automatically has the auth token attached — no need to pass it manually each time.

---

## Token storage — why SecureStore

The auth token (returned by the backend after login) needs to be stored on the device so:
1. The user stays logged in when they close and reopen the app
2. Every API request can include the token in its `Authorization` header

**Why not AsyncStorage?** AsyncStorage is React Native's basic key-value store. It is not encrypted — the token would be stored in plain text on the device. `expo-secure-store` uses the device's built-in secure storage (Keychain on iOS, Keystore on Android), which is encrypted and not accessible to other apps.

```ts
// Save after login
await SecureStore.setItemAsync('token', token);

// Read on app start
const token = await SecureStore.getItemAsync('token');

// Delete on logout
await SecureStore.deleteItemAsync('token');
```

---

## The token bridge problem and how we solved it

There is a timing mismatch between `SecureStore` and Axios:

- `SecureStore.getItemAsync()` is **async** — it returns a Promise
- Axios request interceptors are **synchronous** — they run immediately, no awaiting

This means you cannot simply do this inside the interceptor:

```ts
// THIS DOES NOT WORK
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token'); // async inside sync context
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**The solution:** A module-level variable `_token` in `api.ts`:

```ts
let _token: string | null = null;

export function setToken(token: string | null) {
  _token = token;
}

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});
```

The token is read from `SecureStore` once (on app start in `AppNavigator`) and stored in `_token`. After that, every Axios request reads it synchronously from memory. When the user logs in or out, `setToken()` is called to update it.

---

## Authentication — login, register, logout

All auth logic lives in `src/hooks/useAuth.ts`. It uses TanStack Query's `useMutation` hook, which handles loading state, error state, and success callbacks automatically.

### Login flow

```
User fills in email + password → taps "Sign in"
    │
    ▼ login.mutate({ email, password })
    │
    ▼ POST /api/auth/login
    │
    ├── 401 Invalid credentials → apiError shown in red banner
    │
    └── 200 OK → { user, token }
            │
            ▼ SecureStore.setItemAsync('token', token)   ← persists across restarts
            ▼ setToken(token)                            ← puts in Axios interceptor
            ▼ notifyAuthChange(true)                     ← switches to app stack
```

### Logout flow

```
User taps "Logout"
    │
    ▼ logout.mutate()
    │
    ▼ POST /api/auth/logout   ← tells the server to revoke the token
    │
    └── onSettled (runs whether the request succeeded or failed)
            ▼ SecureStore.deleteItemAsync('token')
            ▼ setToken(null)
            ▼ notifyAuthChange(false)   ← switches back to auth stack
```

`onSettled` (not `onSuccess`) is used for logout deliberately. If the network is down or the token is already expired, the logout request might fail — but the user should still be logged out locally. `onSettled` runs regardless of the result.

---

## Task data — TanStack Query hooks

`src/hooks/useTasks.ts` contains all task-related data fetching. The pattern is the same as the web frontend.

### Reading data — `useQuery`

```ts
export function useTasks(status?: TaskStatus) {
  return useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', status ?? 'all'],
    queryFn: () => api.get('/tasks', { params: status ? { status } : undefined }).then(r => r.data),
  });
}
```

The `queryKey` is like a cache identifier. `['tasks', 'all']`, `['tasks', 'pending']`, and `['tasks', 'completed']` are three separate cache entries. This means switching between filter tabs does not throw away cached data — each filter has its own independently cached result.

### Writing data — `useMutation` + cache invalidation

```ts
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/tasks', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
```

After creating, updating, or deleting a task, `invalidateQueries({ queryKey: ['tasks'] })` marks every task cache entry as stale. TanStack Query automatically refetches them, so the list updates instantly without a page reload or manual refresh.

The `['tasks']` prefix matches all task cache entries (`['tasks', 'all']`, `['tasks', 'pending']`, `['tasks', 'completed']`) — so every filter's list stays in sync after any mutation.

---

## Screens walkthrough

### LoginScreen

A simple form with two controlled inputs (email, password). In React Native, inputs are controlled with `useState` rather than React Hook Form — the form is simple enough that the extra library is not needed.

Key details:
- `KeyboardAvoidingView` pushes the form up when the phone keyboard opens, so the submit button doesn't get hidden
- `ActivityIndicator` (spinning loader) replaces the button text while the request is in flight, and the button is disabled to prevent double-submits
- Two types of errors are handled separately: HTTP errors (the server replied with a 4xx) and network errors (the server could not be reached at all — e.g. wrong IP in `.env`)

### RegisterScreen

Same structure as `LoginScreen` but with four fields. Client-side password confirmation check runs before the request is sent — no point making an API call if the passwords obviously don't match.

### TaskListScreen

The main screen after login. Key pieces:

**Status filter tabs** — three pill buttons (All / Pending / Completed). The selected filter is stored in `useState` in this component and passed to `useTasks(statusFilter)`. When the filter changes, TanStack Query either returns the cached result for that filter or fetches fresh data.

**FlatList** — React Native's high-performance list component. Unlike a web `<ul>`, `FlatList` uses virtual rendering — it only renders the items currently visible on screen, not the entire list. This keeps the app fast even with hundreds of tasks.

**RefreshControl** — wires the native pull-to-refresh gesture to TanStack Query's `refetch()` function. The `isRefetching` boolean shows the native loading spinner while the request is in flight.

**FAB (Floating Action Button)** — the `+ New Task` button pinned to the bottom-right corner using `position: 'absolute'`.

### CreateTaskScreen

Three inputs: title (required), description (optional), and priority (three pill buttons — Low / Medium / High). Client-side check ensures title is not empty before sending the request. The `onSuccess` callback navigates back to `TaskListScreen`, which automatically refetches because the hook invalidated the task cache.

The 10-second duplicate prevention rule from the backend also applies here — if the user creates a task with the same title twice within 10 seconds, the backend returns a `422` and the error message is shown at the top of the form.

---

## Components

### TaskItem

Renders a single row in the task list. Receives a `Task` object as a prop.

**Priority badge** — a coloured label that changes based on priority:

| Priority | Background | Text colour |
|---|---|---|
| High | Red tint | Red |
| Medium | Amber tint | Amber |
| Low | Green tint | Green |

This is implemented as a lookup table (`Record<TaskPriority, { bg, text }>`) rather than a series of if/else statements — cleaner and easier to extend.

**Complete / Undo button** — calls `useUpdateTask` with `{ status: 'completed' }` or `{ status: 'pending' }`. The title has `textDecorationLine: 'line-through'` applied when the task is completed.

**Delete button** — shows a native `Alert` dialog first (the iOS/Android confirmation popup) before calling `useDeleteTask`. This prevents accidental deletions.

Both buttons are disabled while their respective mutations are in flight (`updateTask.isPending`, `deleteTask.isPending`) to prevent double-taps.

---

## Data flow diagram

```
Phone screen
    │
    │  User taps "Sign in"
    ▼
LoginScreen.tsx
    │  login.mutate({ email, password })
    ▼
useAuth.ts  (useMutation)
    │  api.post('/auth/login', data)
    ▼
api.ts  (Axios)
    │  POST http://192.168.x.x:8000/api/auth/login
    │  Authorization: Bearer <token>  ← added by request interceptor
    ▼
Laravel backend
    │  { user, token }
    ▼
useAuth.ts  onSuccess
    │  SecureStore.setItemAsync('token', token)
    │  setToken(token)          → api.ts  _token updated
    │  notifyAuthChange(true)   → authState.ts → AppNavigator.tsx
    ▼
AppNavigator.tsx
    │  setIsLoggedIn(true)
    ▼
App Stack shown (TaskListScreen)
    │
    │  useTasks() runs
    ▼
useTasks.ts  (useQuery)
    │  api.get('/tasks')
    ▼
Laravel backend
    │  { data: [...tasks], total, ... }
    ▼
TaskListScreen.tsx
    │  renders FlatList of TaskItem components
    ▼
Phone screen shows task list
```

---

## File reference

| File | Purpose |
|---|---|
| `App.tsx` | App root — wraps everything in QueryClientProvider |
| `src/types/index.ts` | TypeScript interfaces (Task, User, AuthResponse, etc.) |
| `src/lib/api.ts` | Axios instance, `setToken()`, request interceptor |
| `src/lib/authState.ts` | Bridge to avoid circular dependency between navigator and hooks |
| `src/navigation/AppNavigator.tsx` | Auth stack vs app stack routing, SecureStore check on startup |
| `src/hooks/useAuth.ts` | Login, register, logout mutations |
| `src/hooks/useTasks.ts` | Task list query, create/update/delete mutations |
| `src/screens/LoginScreen.tsx` | Email + password form |
| `src/screens/RegisterScreen.tsx` | Name + email + password registration form |
| `src/screens/TaskListScreen.tsx` | Task list with filter tabs and pull-to-refresh |
| `src/screens/CreateTaskScreen.tsx` | Create task form |
| `src/components/TaskItem.tsx` | Single task row with complete/undo and delete |
