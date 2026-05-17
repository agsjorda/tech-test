'use client';

// ─── TaskFilters — status filter pill buttons ─────────────────────────────────
// Renders three buttons: All, Pending, Completed.
// The parent (TaskList) holds the active filter in state and passes it down.
// When the user clicks a button, onChange is called with the new value so the
// parent can update its state, which re-fetches via useTasks(status).
// This is the "lifting state up" pattern — filter state lives in the parent so
// the task list and the filter buttons both stay in sync from a single source of truth.

import type { TaskStatus } from '@/types';

interface TaskFiltersProps {
  current: TaskStatus | undefined; // undefined means "all tasks" (no filter active)
  onChange: (status: TaskStatus | undefined) => void;
}

// Defined outside the component so the array is not re-created on every render
const FILTERS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export function TaskFilters({ current, onChange }: TaskFiltersProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(({ label, value }) => {
        // Highlight the currently active filter differently from inactive ones
        const isActive = current === value;
        return (
          <button
            key={label}
            onClick={() => onChange(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
