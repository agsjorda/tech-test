'use client';

import type { TaskStatus } from '@/types';

interface TaskFiltersProps {
  current: TaskStatus | undefined;
  onChange: (status: TaskStatus | undefined) => void;
}

// The three filter options — undefined means "show all"
const FILTERS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export function TaskFilters({ current, onChange }: TaskFiltersProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(({ label, value }) => {
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
