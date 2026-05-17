// ─── Axios API client ─────────────────────────────────────────────────────────
// All HTTP requests to the Laravel backend go through this single instance.
// Centralising it here means auth headers and error handling are applied once,
// not scattered across every component.

import axios from 'axios';

// Create a pre-configured Axios instance.
// NEXT_PUBLIC_API_URL is set in .env.local (e.g. http://localhost:8000/api).
// The NEXT_PUBLIC_ prefix is required for Next.js to expose env vars to the browser.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    // Tell Laravel to return JSON errors instead of HTML redirects
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach auth token ──────────────────────────────────
// Runs before every request is sent.
// Reads the Sanctum Bearer token from localStorage and adds it to the
// Authorization header so the backend knows who is making the request.
api.interceptors.request.use((config) => {
  // typeof window check prevents this running during Next.js server-side rendering
  // (localStorage does not exist on the server)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // Laravel Sanctum expects: Authorization: Bearer <token>
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor — handle 401 Unauthorised ──────────────────────────
// Runs after every response is received.
// If the server returns 401 (token missing, expired, or revoked), we clear the
// stored token and send the user back to the login page automatically.
api.interceptors.response.use(
  // Pass successful responses straight through unchanged
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Remove the invalid token from both storage locations
      localStorage.removeItem('token');
      document.cookie = 'token=; Max-Age=0; path=/';
      // Hard redirect so the Next.js middleware re-evaluates the cookie state
      window.location.href = '/login';
    }
    // Re-throw the error so calling code (e.g. useMutation) can still catch it
    return Promise.reject(error);
  }
);
