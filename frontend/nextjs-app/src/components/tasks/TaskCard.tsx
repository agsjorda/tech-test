'use client';

// ─── TaskCard — single task display with actions ──────────────────────────────
// Receives one task object as a prop and renders it as a card.
// Handles two actions directly: marking complete/undo and deleting.
// After either action succeeds, useTasks automatically refetches via cache
// invalidation in useUpdateTask / useDeleteTask — no manual state update needed.

import type { Task } from '@/types';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';

interface TaskCardProps {
  task: Task;
}

// Lookup table: maps each priority value to a Tailwind colour combination.
// Using Record<Task['priority'], string> ensures TypeScript will error if we
// add a new priority enum value without updating this map.
const PRIORITY_STYLES: Record<Task['priority'], string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export function TaskCard({ task }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isCompleted = task.status === 'completed';

  // Toggle between pending and completed by sending the opposite status
  function toggleComplete() {
    updateTask.mutate({
      id: task.id,
      data: { status: isCompleted ? 'pending' : 'completed' },
    });
  }

  // Confirm before deleting — irreversible action
  function handleDelete() {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(task.id);
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col gap-2 transition-opacity ${
        // Dim completed tasks visually to distinguish them from active ones
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      {/* ── Title + priority badge row ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`font-medium text-gray-900 leading-snug ${
            // Strike through the title when the task is done
            isCompleted ? 'line-through text-gray-400' : ''
          }`}
        >
          {task.title}
        </h3>

        {/* Coloured pill showing priority — colour comes from PRIORITY_STYLES above */}
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
            PRIORITY_STYLES[task.priority]
          }`}
        >
          {task.priority}
        </span>
      </div>

      {/* ── Optional description ──────────────────────────────────────────── */}
      {/* Only rendered when the task has a description — avoids empty space */}
      {task.description && (
        <p className="text-sm text-gray-500 leading-relaxed">{task.description}</p>
      )}

      {/* ── Date + action buttons row ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-1">
        {/* created_at comes from the API as an ISO string; toLocaleDateString formats it */}
        <span className="text-xs text-gray-400">
          {new Date(task.created_at).toLocaleDateString()}
        </span>

        <div className="flex gap-2">
          {/* Complete / Undo — disabled while the API call is in flight to prevent double-submit */}
          <button
            onClick={toggleComplete}
            disabled={updateTask.isPending}
            className="text-xs px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isCompleted ? 'Undo' : 'Complete'}
          </button>

          {/* Delete — red styling signals a destructive action */}
          <button
            onClick={handleDelete}
            disabled={deleteTask.isPending}
            className="text-xs px-3 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
