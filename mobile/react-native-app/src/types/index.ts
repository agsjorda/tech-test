// ─── Shared TypeScript types ───────────────────────────────────────────────────
// Mirror of the frontend types — both apps talk to the same Laravel API so
// the shapes are identical. Keeping them in one file means a single change
// here propagates to every screen and hook.

export type TaskStatus = 'pending' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high';

// Matches a row from the `tasks` table as returned by TaskController
export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

// Laravel's paginate() wraps results in this envelope
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

// Returned by POST /auth/login and POST /auth/register
export interface AuthResponse {
  user: User;
  token: string;
}
