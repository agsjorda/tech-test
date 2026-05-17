'use client';

// ─── Auth mutations (login, register, logout) ─────────────────────────────────
// useMutation is the TanStack Query hook for operations that change data
// (POST/PUT/DELETE), as opposed to useQuery which is for reading data (GET).
//
// Each hook returns an object with:
//   .mutate(data)   — trigger the request
//   .isPending      — true while the request is in flight (use to disable buttons)
//   .error          — the Axios error if the request failed
//   .isSuccess      — true if the last request succeeded

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { AuthResponse } from '@/types';
import type { LoginInput, RegisterInput } from '@/lib/schemas';

// ─── Token helpers ─────────────────────────────────────────────────────────────

// Saves the Sanctum token in two places:
//   1. localStorage — so the Axios interceptor can attach it to every API request
//   2. Cookie       — so the Next.js middleware (server-side) can read it and
//                     protect routes without exposing it via a server-side call
function persistToken(token: string) {
  localStorage.setItem('token', token);
  // SameSite=Lax prevents the cookie being sent on cross-site requests (CSRF mitigation)
  document.cookie = `token=${token}; path=/; SameSite=Lax`;
}

// Removes the token from both storage locations on logout
function clearToken() {
  localStorage.removeItem('token');
  // Max-Age=0 immediately expires the cookie, effectively deleting it
  document.cookie = 'token=; Max-Age=0; path=/';
}

// ─── useLogin ─────────────────────────────────────────────────────────────────
export function useLogin() {
  const router = useRouter();

  return useMutation({
    // mutationFn is the async function that actually calls the API.
    // It receives whatever you pass to .mutate(data).
    mutationFn: (data: LoginInput) =>
      api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

    // onSuccess runs only if the API returned 2xx.
    // We save the token then navigate to the task list.
    onSuccess: ({ token }) => {
      persistToken(token);
      router.push('/tasks');
    },
    // Errors are accessible via login.error in the component — no onError needed here
  });
}

// ─── useRegister ──────────────────────────────────────────────────────────────
export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

    // Same as login — save token and redirect on success
    onSuccess: ({ token }) => {
      persistToken(token);
      router.push('/tasks');
    },
  });
}

// ─── useLogout ────────────────────────────────────────────────────────────────
export function useLogout() {
  // useQueryClient gives us access to the TanStack Query cache
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    // Tell the backend to delete the current access token from the DB
    mutationFn: () => api.post('/auth/logout'),

    // onSettled runs whether the API call succeeded OR failed.
    // This ensures the user is always logged out locally even if the network
    // request fails (e.g. token already expired on the server).
    onSettled: () => {
      clearToken();
      // Clear all cached query data so the next user doesn't see stale data
      queryClient.clear();
      router.push('/login');
    },
  });
}
