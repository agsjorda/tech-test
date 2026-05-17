'use client';

// ─── Task data-fetching hooks ─────────────────────────────────────────────────
// useQuery is for reading data (GET requests) — TanStack Query handles caching,
// background refetching, and loading/error states automatically.
// useMutation is for writes (POST/PUT/DELETE).
//
// After any mutation succeeds we call queryClient.invalidateQueries(['tasks'])
// which tells TanStack Query that the cached task list is stale and must be
// refetched — this is how the UI updates without a page reload.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task, PaginatedResponse, TaskStatus } from '@/types';

// ─── useTasks — fetch the task list ───────────────────────────────────────────
// The optional `status` parameter filters to pending or completed tasks.
// Passing `undefined` returns all tasks.
export function useTasks(status?: TaskStatus) {
  return useQuery<PaginatedResponse<Task>>({
    // queryKey is like a cache key — a unique identifier for this query.
    // Including `status` means each filter has its own cache entry, so switching
    // between "All" and "Pending" does not throw away the other filter's data.
    queryKey: ['tasks', status ?? 'all'],

    queryFn: () =>
      api
        // Only include the `status` param when a filter is active
        .get('/tasks', { params: status ? { status } : undefined })
        .then((r) => r.data),
  });
}

// ─── useTask — fetch a single task ────────────────────────────────────────────
export function useTask(id: number) {
  return useQuery<Task>({
    queryKey: ['tasks', id], // numeric ID as part of the key so each task is cached separately
    queryFn: () => api.get(`/tasks/${id}`).then((r) => r.data),
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
      api.post('/tasks', data).then((r) => r.data),

    // Invalidate ALL task queries (any status filter) so every cached list
    // refreshes and shows the new task wherever it belongs.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── useUpdateTask — mark complete, change priority, etc. ────────────────────
interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    // The mutation receives both the task id and the fields to update.
    // We use an object `{ id, data }` so the call site reads clearly:
    //   updateTask.mutate({ id: task.id, data: { status: 'completed' } })
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskData }) =>
      api.put(`/tasks/${id}`, data).then((r) => r.data),

    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── useDeleteTask ────────────────────────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    // DELETE /api/tasks/{id} returns 204 No Content — no response body to parse
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
