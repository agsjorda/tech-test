<?php

namespace App\Repositories\Contracts;

use App\Models\Task;
use Illuminate\Pagination\LengthAwarePaginator;

/*
|--------------------------------------------------------------------------
| TaskRepositoryInterface
|--------------------------------------------------------------------------
| An interface defines a CONTRACT — a list of methods that any class
| implementing it MUST provide. Think of it as a job description.
|
| Why bother with an interface?
| - TaskService depends on this interface, not on TaskRepository directly.
| - In production, AppServiceProvider binds this interface to TaskRepository.
| - In unit tests, we can pass a mock object that also "implements" this
|   interface, so tests run without hitting the real database at all.
| - If we ever switch from SQLite to PostgreSQL or even an external API,
|   we only need to write a new class that implements this interface —
|   TaskService doesn't need to change at all.
*/
interface TaskRepositoryInterface
{
    /**
     * Return a paginated list of tasks for a user, with optional filters.
     * e.g. $filters = ['status' => 'pending']
     */
    public function paginate(int $userId, array $filters, int $perPage = 15): LengthAwarePaginator;

    /**
     * Find a single task by ID that belongs to the given user.
     * Must throw ModelNotFoundException (404) if not found or wrong user.
     */
    public function find(int $userId, int $taskId): Task;

    /**
     * Insert a new task row and return the fresh model (with DB defaults loaded).
     */
    public function create(array $data): Task;

    /**
     * Update a task's fields and return the refreshed model.
     */
    public function update(Task $task, array $data): Task;

    /**
     * Delete a task row from the database.
     */
    public function delete(Task $task): bool;

    /**
     * Check whether a task with the given title was created by this user
     * within the last $seconds seconds. Used for duplicate prevention.
     */
    public function existsWithTitleWithinSeconds(string $title, int $userId, int $seconds): bool;
}
