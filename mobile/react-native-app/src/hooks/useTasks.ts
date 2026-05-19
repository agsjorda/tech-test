// ─── Task data-fetching hooks ─────────────────────────────────────────────────
// Same pattern as the frontend — useQuery for reads, useMutation for writes.
// After any mutation succeeds, invalidateQueries(['tasks']) tells TanStack Query
// the cached list is stale and must be refetched, so the UI stays in sync.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Task, PaginatedResponse, TaskStatus } from '../types';

// ─── useTasks — fetch the task list ───────────────────────────────────────────
// Optional status filter — undefined returns all tasks.
// Each filter value gets its own cache entry so switching filters
// doesn't discard cached data for other filters.
export function useTasks(status?: TaskStatus) {
  return useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', status ?? 'all'],
    queryFn: () =>
      api
        .get('/tasks', { params: status ? { status } : undefined })
        .then((r) => r.data),
  });
}

// ─── useCreateTask ────────────────────────────────────────────────────────────
interface CreateTaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskData) =>
      api.post<Task>('/tasks', data).then((r) => r.data),

    // Invalidate ALL task cache entries so every filter's list refreshes
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── useUpdateTask ────────────────────────────────────────────────────────────
interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskData }) =>
      api.put<Task>(`/tasks/${id}`, data).then((r) => r.data),

    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── useDeleteTask ────────────────────────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    // DELETE /api/tasks/{id} returns 204 No Content — no body to parse
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
