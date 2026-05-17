'use client';

import type { Task } from '@/types';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';

interface TaskCardProps {
  task: Task;
}

// Maps priority to a pill colour
const PRIORITY_STYLES: Record<Task['priority'], string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export function TaskCard({ task }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isCompleted = task.status === 'completed';

  function toggleComplete() {
    updateTask.mutate({
      id: task.id,
      data: { status: isCompleted ? 'pending' : 'completed' },
    });
  }

  function handleDelete() {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(task.id);
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col gap-2 transition-opacity ${
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`font-medium text-gray-900 leading-snug ${
            isCompleted ? 'line-through text-gray-400' : ''
          }`}
        >
          {task.title}
        </h3>

        {/* Priority badge */}
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
            PRIORITY_STYLES[task.priority]
          }`}
        >
          {task.priority}
        </span>
      </div>

      {/* Optional description */}
      {task.description && (
        <p className="text-sm text-gray-500 leading-relaxed">{task.description}</p>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400">
          {new Date(task.created_at).toLocaleDateString()}
        </span>

        <div className="flex gap-2">
          {/* Toggle complete / undo */}
          <button
            onClick={toggleComplete}
            disabled={updateTask.isPending}
            className="text-xs px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isCompleted ? 'Undo' : 'Complete'}
          </button>

          {/* Delete */}
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
