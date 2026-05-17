'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { AuthResponse } from '@/types';
import type { LoginInput, RegisterInput } from '@/lib/schemas';

// Saves token to localStorage and mirrors it to a cookie for Next.js middleware
function persistToken(token: string) {
  localStorage.setItem('token', token);
  document.cookie = `token=${token}; path=/; SameSite=Lax`;
}

function clearToken() {
  localStorage.removeItem('token');
  document.cookie = 'token=; Max-Age=0; path=/';
}

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) =>
      api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
    onSuccess: ({ token }) => {
      persistToken(token);
      router.push('/tasks');
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
    onSuccess: ({ token }) => {
      persistToken(token);
      router.push('/tasks');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      // Clear token and cache regardless of API response
      clearToken();
      queryClient.clear();
      router.push('/login');
    },
  });
}
