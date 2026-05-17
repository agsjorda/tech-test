<?php

namespace App\Repositories;

use App\Models\Task;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

/*
|--------------------------------------------------------------------------
| TaskRepository
|--------------------------------------------------------------------------
| This is the ONLY place in the app that talks directly to the tasks table.
| All Eloquent queries live here. If you need to change how data is fetched
| (e.g. add eager loading, change sort order), you change it here — not in
| the service or controller.
|
| This class implements TaskRepositoryInterface, meaning it must provide
| every method declared in that interface or PHP will throw an error.
*/
class TaskRepository implements TaskRepositoryInterface
{
    /**
     * Fetch a paginated list of tasks for a user.
     *
     * Task::where('user_id', $userId) ensures we only ever query THIS user's
     * tasks — even if someone passes someone else's user_id, the DB WHERE
     * clause prevents leaking data.
     *
     * latest() is shorthand for orderBy('created_at', 'desc') — newest first.
     *
     * paginate(15) returns 15 tasks per page and automatically reads the
     * ?page= query parameter from the URL.
     */
    public function paginate(int $userId, array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Task::where('user_id', $userId);

        // Only apply the status filter if it was actually provided.
        // If we always added ->where('status', null) it would return no results.
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * Find a single task by ID scoped to the user.
     *
     * The two where() clauses together mean: "find task with this ID that
     * also belongs to this user". If either condition fails, findOrFail()
     * throws a ModelNotFoundException which Laravel turns into a 404 response.
     *
     * This is the security gate — it prevents User A from reading/editing
     * User B's tasks even if they know the task ID.
     */
    public function find(int $userId, int $taskId): Task
    {
        return Task::where('user_id', $userId)->findOrFail($taskId);
    }

    /**
     * Insert a new task and return the model reloaded from the database.
     *
     * Why fresh()? When Task::create($data) runs, Laravel builds the model
     * in memory with only the fields you passed. Fields with database defaults
     * (like status='pending') won't be in the in-memory model unless we
     * reload it. fresh() runs a SELECT to get the complete, up-to-date row.
     */
    public function create(array $data): Task
    {
        return Task::create($data)->fresh();
    }

    /**
     * Update a task's fields.
     *
     * $task->update($data) runs an UPDATE query with only the provided fields.
     * fresh() reloads the model from the DB so the response reflects the
     * actual stored values (not just what we think we set).
     */
    public function update(Task $task, array $data): Task
    {
        $task->update($data);

        return $task->fresh();
    }

    /**
     * Delete a task row from the database.
     * Returns true on success, false on failure.
     */
    public function delete(Task $task): bool
    {
        return $task->delete();
    }

    /**
     * Check for a duplicate task title within a time window.
     *
     * This query uses the composite index on (user_id, title, created_at)
     * that we defined in the migration — so it's fast even with many tasks.
     *
     * now()->subSeconds($seconds) calculates the timestamp $seconds ago.
     * exists() returns true/false without loading any rows (more efficient
     * than count() or get() when you just need a yes/no answer).
     *
     * Example: existsWithTitleWithinSeconds('Buy milk', 5, 10)
     * → "Did user 5 create a task titled 'Buy milk' in the last 10 seconds?"
     */
    public function existsWithTitleWithinSeconds(string $title, int $userId, int $seconds): bool
    {
        return Task::where('user_id', $userId)
            ->where('title', $title)
            ->where('created_at', '>=', now()->subSeconds($seconds))
            ->exists();
    }
}
