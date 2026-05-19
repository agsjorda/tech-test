// ─── Axios API client ─────────────────────────────────────────────────────────
// All HTTP requests to the Laravel backend go through this single instance.
//
// Token storage challenge on mobile:
// expo-secure-store is async, but Axios request interceptors are synchronous.
// Solution: keep a module-level _token variable. On app load, AppNavigator
// reads from SecureStore and calls setToken() to populate it. From that point,
// every Axios request picks up the token synchronously from _token.

import axios from 'axios';

// EXPO_PUBLIC_ prefix is required for Expo to expose env vars to the JS bundle
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Module-level token — set by AppNavigator on load and by useAuth on login/logout
let _token: string | null = null;

// Called by AppNavigator (on mount) and useAuth (after login/register/logout)
export function setToken(token: string | null) {
  _token = token;
}

// ─── Request interceptor — attach auth token ──────────────────────────────────
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});
