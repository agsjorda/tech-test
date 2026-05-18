'use client';

// ─── CreateTaskForm — new task form with validation ───────────────────────────
// Uses React Hook Form for form state management and Zod (via zodResolver) for
// validation. This means:
//   1. No controlled <input> state — RHF registers inputs via {...register('field')}
//   2. Validation runs against the Zod schema before onSubmit is ever called
//   3. Field-level errors come from Zod and are shown below each input
//
// On success the API returns the created task and we redirect to /tasks.
// On 422 (e.g. duplicate title within 10 seconds), we display the backend's
// error message at the top of the form.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createTaskSchema, type CreateTaskInput } from '@/lib/schemas';
import { useCreateTask } from '@/hooks/useTasks';

export function CreateTaskForm() {
  const router = useRouter();
  const createTask = useCreateTask();

  const {
    register,   // connects an input to RHF so it tracks value/validation
    handleSubmit, // wraps our onSubmit — only calls it if Zod validation passes
    formState: { errors }, // per-field error messages from Zod
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema), // hand validation off to Zod
    defaultValues: { priority: 'medium' },  // pre-select medium priority
  });

  function onSubmit(data: CreateTaskInput) {
    // Pass onSuccess inline here (not in the hook) so we can use router.push
    // inside the component where the router is available
    createTask.mutate(data, {
      onSuccess: () => router.push('/tasks'),
    });
  }

  // The Axios error shape: error.response.data.message
  // We cast to a known shape because TypeScript types the error as `unknown`
  const apiError =
    createTask.error && 'response' in createTask.error
      ? (
          createTask.error as {
            response?: { data?: { message?: string } };
          }
        ).response?.data?.message
      : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-16">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New task</h1>

        {/* Backend error banner (e.g. "A task with this title was created less than 10 seconds ago.") */}
        {apiError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* handleSubmit validates first, then calls onSubmit if everything is valid */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Title ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            {/* {...register('title')} wires this input to RHF — no onChange needed */}
            <input
              {...register('title')}
              type="text"
              placeholder="e.g. Write unit tests"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* errors.title is set by Zod when the field is invalid */}
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* ── Description (optional) ──────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Optional details…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* ── Priority ────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            {/* A <select> registered with RHF works the same as an <input> */}
            <select
              {...register('priority')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* ── Cancel / Submit ─────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            {/* type="button" prevents this from submitting the form */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTask.isPending} // prevent double-submit while request is in flight
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createTask.isPending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
