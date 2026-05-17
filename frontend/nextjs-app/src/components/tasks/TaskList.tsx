'use client';

// ─── TaskList — main task list page component ─────────────────────────────────
// This is the top-level component for the /tasks route.
// It owns the active status filter in local state, passes it down to TaskFilters
// (to highlight the active button) and up to useTasks (to fetch filtered data).
// TanStack Query's isLoading / isError flags drive the loading and error UI.

import { useState } from 'react';
import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { useLogout } from '@/hooks/useAuth';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { TaskStatus } from '@/types';

export function TaskList() {
  // undefined = no filter (show all tasks); 'pending' or 'completed' = filtered
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);

  // useTasks fetches GET /api/tasks (with optional ?status= param).
  // When statusFilter changes, TanStack Query re-fetches with the new params.
  const { data, isLoading, isError } = useTasks(statusFilter);
  const logout = useLogout();

  // The API returns a paginated envelope — the actual task array is in data.data.
  // We default to [] so the map below doesn't break during loading.
  const tasks = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navigation bar ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Task Manager</h1>

          {/* Sign out calls POST /auth/logout then clears the token and redirects */}
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ── Filter pills + "New task" button ──────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* TaskFilters is a controlled component — we pass state down and
              update state via the onChange callback (lifting state up pattern) */}
          <TaskFilters current={statusFilter} onChange={setStatusFilter} />
          <Link
            href="/tasks/create"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New task
          </Link>
        </div>

        {/* ── Loading state — shown while the first fetch is in progress ── */}
        {isLoading && <LoadingSpinner />}

        {/* ── Error state — shown if the API request fails ─────────────── */}
        {isError && (
          <ErrorMessage message="Failed to load tasks. Please refresh the page." />
        )}

        {/* ── Empty state — shown when fetch succeeded but returned no tasks */}
        {!isLoading && !isError && tasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No tasks yet.</p>
            <p className="text-sm mt-1">Create your first task to get started.</p>
          </div>
        )}

        {/* ── Task cards — one per task from the API ─────────────────────── */}
        {/* key={task.id} lets React track each card individually so it can
            update/remove the right card without re-rendering the whole list */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>

        {/* ── Pagination hint — shown when not all tasks fit on one page ── */}
        {data && data.total > data.per_page && (
          <p className="text-center text-xs text-gray-400">
            Showing {tasks.length} of {data.total} tasks
          </p>
        )}
      </main>
    </div>
  );
}
