'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task, PaginatedResponse, TaskStatus } from '@/types';

// ─── Fetch tasks (optionally filtered by status) ──────────────────────────────

export function useTasks(status?: TaskStatus) {
  return useQuery<PaginatedResponse<Task>>({
    // queryKey includes the filter so each status gets its own cache entry
    queryKey: ['tasks', status ?? 'all'],
    queryFn: () =>
      api
        .get('/tasks', { params: status ? { status } : undefined })
        .then((r) => r.data),
  });
}

// ─── Fetch a single task ───────────────────────────────────────────────────────

export function useTask(id: number) {
  return useQuery<Task>({
    queryKey: ['tasks', id],
    queryFn: () => api.get(`/tasks/${id}`).then((r) => r.data),
  });
}

// ─── Create a new task ─────────────────────────────────────────────────────────

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
    // Invalidate all task queries so every filter refreshes
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Update a task (mark complete, change priority, etc.) ─────────────────────

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
      api.put(`/tasks/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Delete a task ─────────────────────────────────────────────────────────────

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
