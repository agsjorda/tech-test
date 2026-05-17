// ─── Zod validation schemas ───────────────────────────────────────────────────
// Zod lets us define the shape AND validation rules for form data in one place.
// React Hook Form uses these schemas via zodResolver to validate inputs before
// the form is submitted — no manual if/else validation logic needed.
//
// The rules here intentionally mirror the Laravel FormRequest rules on the
// backend, so the user gets instant feedback in the browser that matches what
// the API would reject anyway.

import { z } from 'zod';

// ─── Login ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  // Laravel's default minimum password length is 8 characters
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── Register ──────────────────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  // .refine() lets us add cross-field validation — in this case checking that
  // both password fields match before the form is submitted.
  // The `path` tells React Hook Form which field to attach the error to.
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation'],
  });

// ─── Create task ───────────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  // Optional — the API accepts tasks without a description
  description: z.string().optional(),
  // z.enum restricts the value to exactly these three strings
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

// Infer TypeScript types directly from the schemas so they always stay in sync.
// Using `z.infer<typeof schema>` means we never have to write a separate interface.
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
