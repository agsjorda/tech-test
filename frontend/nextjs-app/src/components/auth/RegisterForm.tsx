'use client';

// ─── RegisterForm ─────────────────────────────────────────────────────────────
// Four fields: name, email, password, password_confirmation.
// The Zod schema (registerSchema) uses .refine() to check the two password
// fields match before the form is submitted — this gives instant browser-side
// feedback without an API round-trip.
//
// Flow:
//   1. User fills in all fields
//   2. User clicks "Create account"
//   3. zodResolver runs registerSchema — shows errors if invalid, stops here
//   4. onSubmit fires → register_.mutate(data) → POST /auth/register
//   5a. Success: useRegister saves token + redirects to /tasks
//   5b. Error: apiError is displayed (e.g. "The email has already been taken.")

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { registerSchema, type RegisterInput } from '@/lib/schemas';
import { useRegister } from '@/hooks/useAuth';

export function RegisterForm() {
  // Renamed to register_ to avoid clashing with RHF's `register` function below
  const register_ = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterInput) => register_.mutate(data);

  // The register endpoint can return field-level validation errors (errors key)
  // or a top-level message — we handle both shapes here
  const apiError =
    register_.error && 'response' in register_.error
      ? (register_.error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create account</h1>

        {/* Backend error banner — e.g. "The email has already been taken." */}
        {apiError?.message && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{apiError.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Name ───────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              {...register('name')}
              type="text"
              autoComplete="name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* ── Email ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
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
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* ── Confirm password ────────────────────────────────────────── */}
          {/* This field is validated cross-field by the .refine() in registerSchema —
              if it doesn't match the password field, errors.password_confirmation is set */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              {...register('password_confirmation')}
              type="password"
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password_confirmation && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={register_.isPending}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {register_.isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
