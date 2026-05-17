import axios from 'axios';

// Base Axios instance — all requests go through here
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach the Bearer token to every request automatically.
// Reads from localStorage so the user stays logged in after page refresh.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// If the API returns 401, the token is invalid/expired — clear it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      document.cookie = 'token=; Max-Age=0; path=/';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
