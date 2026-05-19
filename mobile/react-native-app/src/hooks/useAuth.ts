// ─── Auth hooks ───────────────────────────────────────────────────────────────
// useMutation from TanStack Query handles loading state, error state, and
// the onSuccess callback — no manual useState needed for any of that.
//
// Token lifecycle:
//   Login / Register → save to SecureStore (persists across app restarts)
//                    → call setToken() (puts it in the Axios interceptor)
//                    → call notifyAuthChange(true) (switches to app stack)
//   Logout           → delete from SecureStore
//                    → call setToken(null) (removes from Axios interceptor)
//                    → call notifyAuthChange(false) (switches to auth stack)

import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { api, setToken } from '../lib/api';
import { notifyAuthChange } from '../lib/authState';
import type { AuthResponse } from '../types';

// ─── Shared helper — saves token and switches to app stack ────────────────────
async function saveTokenAndNavigate(token: string) {
  await SecureStore.setItemAsync('token', token);
  setToken(token);
  notifyAuthChange(true);
}

// ─── useLogin ─────────────────────────────────────────────────────────────────
interface LoginData {
  email: string;
  password: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginData) =>
      api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

    onSuccess: async ({ token }) => {
      await saveTokenAndNavigate(token);
    },
  });
}

// ─── useRegister ──────────────────────────────────────────────────────────────
interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterData) =>
      api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

    onSuccess: async ({ token }) => {
      await saveTokenAndNavigate(token);
    },
  });
}

// ─── useLogout ────────────────────────────────────────────────────────────────
export function useLogout() {
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),

    // onSettled runs whether the request succeeds or fails — ensures the user
    // is always logged out locally even if the network call fails
    onSettled: async () => {
      await SecureStore.deleteItemAsync('token');
      setToken(null);
      notifyAuthChange(false);
    },
  });
}
