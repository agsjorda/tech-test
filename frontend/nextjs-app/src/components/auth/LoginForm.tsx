'use client';

// ─── LoginForm ────────────────────────────────────────────────────────────────
// Controlled by React Hook Form — inputs are registered via {...register('field')}
// rather than managed with useState. The form is only submitted once Zod validates
// all fields, so the API never receives invalid data.
//
// Flow:
//   1. User fills in email + password
//   2. User clicks "Sign in"
//   3. zodResolver runs loginSchema — shows errors if invalid, stops here
//   4. onSubmit fires → login.mutate(data) → POST /auth/login
//   5a. Success: useLogin saves token + redirects to /tasks
//   5b. Error: apiError is set from error.response.data.message, shown at top

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import { useLogin } from '@/hooks/useAuth';

export function LoginForm() {
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => login.mutate(data);

  // Extract a readable error message from the Axios error.
  // login.error is typed as Error | null — we need to narrow it to the
  // Axios shape to safely read the nested response body.
  const apiError =
    login.error && 'response' in login.error
      ? (login.error as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sign in</h1>

        {/* Backend error banner — e.g. "Invalid credentials" from a 401 response */}
        {apiError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Email ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
            {/* errors.email is populated by Zod when the field fails validation */}
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* ── Password ───────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────────────── */}
          {/* isPending is true while POST /auth/login is in flight — disables button
              to prevent the user from submitting twice */}
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
