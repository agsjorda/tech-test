// ─── Shared TypeScript types ───────────────────────────────────────────────────
// These mirror the shape of the JSON the Laravel API returns.
// Keeping them in one place means a single change here propagates everywhere.

// The two allowed values for task.status — matches the Laravel enum column
export type TaskStatus = 'pending' | 'completed';

// The three allowed values for task.priority — matches the Laravel enum column
export type TaskPriority = 'low' | 'medium' | 'high';

// Matches a row from the `tasks` table as returned by TaskController
export interface Task {
  id: number;
  user_id: number;       // the owner — tasks are always scoped to one user
  title: string;
  description: string | null; // nullable in the DB so could be null, not just ""
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;    // ISO 8601 string from Laravel's JSON serialisation
  updated_at: string;
}

// Laravel's paginate() method wraps results in this envelope.
// The generic <T> lets us reuse this shape for any resource (e.g. PaginatedResponse<Task>).
export interface PaginatedResponse<T> {
  data: T[];             // the actual records for this page
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;         // total records across all pages
}

// Matches the `user` object inside the API's auth response
export interface User {
  id: number;
  name: string;
  email: string;
}

// What the API returns from POST /auth/login and POST /auth/register
export interface AuthResponse {
  user: User;
  token: string; // Sanctum plain-text token — store this and send as Bearer header
}
