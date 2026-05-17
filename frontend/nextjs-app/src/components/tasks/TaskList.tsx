'use client';

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
  // The active status filter; undefined = show all
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);

  const { data, isLoading, isError } = useTasks(statusFilter);
  const logout = useLogout();

  const tasks = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Task Manager</h1>
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
        {/* Filter + create row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TaskFilters current={statusFilter} onChange={setStatusFilter} />
          <Link
            href="/tasks/create"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New task
          </Link>
        </div>

        {/* Content states */}
        {isLoading && <LoadingSpinner />}

        {isError && (
          <ErrorMessage message="Failed to load tasks. Please refresh the page." />
        )}

        {!isLoading && !isError && tasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No tasks yet.</p>
            <p className="text-sm mt-1">Create your first task to get started.</p>
          </div>
        )}

        {/* Task cards */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>

        {/* Pagination summary */}
        {data && data.total > data.per_page && (
          <p className="text-center text-xs text-gray-400">
            Showing {tasks.length} of {data.total} tasks
          </p>
        )}
      </main>
    </div>
  );
}
