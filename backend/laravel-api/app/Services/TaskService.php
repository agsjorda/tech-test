<?php

namespace App\Services;

use App\Exceptions\DuplicateTaskException;
use App\Models\Task;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| TaskService
|--------------------------------------------------------------------------
| This is where the BUSINESS LOGIC lives. The controller handles HTTP.
| The repository handles database queries. The service sits between them
| and owns the rules that make this app behave correctly.
|
| Key rule in this service: no task can be created with the same title
| within 10 seconds by the same user. This prevents accidental duplicates
| from double-clicks or network retries.
|
| The service only knows about the TaskRepositoryInterface (not the concrete
| TaskRepository class). This means in tests we can swap in a fake repository
| without touching a real database — making unit tests fast and reliable.
*/
class TaskService
{
    /**
     * Laravel injects the repository automatically. Because we bound
     * TaskRepositoryInterface → TaskRepository in AppServiceProvider,
     * Laravel knows to create a TaskRepository and pass it here.
     *
     * Using the interface (not the concrete class) means this service
     * doesn't care HOW data is stored — only WHAT operations are available.
     */
    public function __construct(
        private readonly TaskRepositoryInterface $repository,
    ) {}

    /**
     * Get a paginated list of tasks for a specific user, with optional filtering.
     *
     * We pass the userId so the repository can scope the query — users should
     * never see each other's tasks.
     *
     * $filters example: ['status' => 'pending']
     * Returns a LengthAwarePaginator which automatically adds pagination
     * metadata (current_page, total, last_page, etc.) to the JSON response.
     */
    public function listTasks(int $userId, array $filters): LengthAwarePaginator
    {
        return $this->repository->paginate($userId, $filters);
    }

    /**
     * Get a single task by ID, scoped to the user.
     * Throws a ModelNotFoundException (→ 404 response) if not found.
     */
    public function getTask(int $userId, int $taskId): Task
    {
        return $this->repository->find($userId, $taskId);
    }

    /**
     * Create a new task — with duplicate prevention.
     *
     * Why DB::transaction()?
     * Without a transaction, there's a tiny window (a "race condition") where
     * two simultaneous requests could both pass the duplicate check and both
     * insert. Wrapping in a transaction locks the check and insert together,
     * so only one can succeed at a time.
     *
     * Flow:
     *  1. Check if a task with the same title exists for this user in the last 10s.
     *  2. If yes → throw DuplicateTaskException (controller catches this → 422).
     *  3. If no  → insert the new task with the user_id attached.
     *
     * The spread operator [...$data, 'user_id' => $userId] merges the validated
     * form data with the user_id, so we never rely on the client to send their
     * own user_id (that would be a security hole).
     */
    public function createTask(array $data, int $userId): Task
    {
        return DB::transaction(function () use ($data, $userId) {
            if ($this->repository->existsWithTitleWithinSeconds($data['title'], $userId, 10)) {
                throw new DuplicateTaskException();
            }

            return $this->repository->create([...$data, 'user_id' => $userId]);
        });
    }

    /**
     * Update an existing task.
     *
     * We call find() first (not just update by ID) so that the repository
     * enforces the user_id scope — a user cannot update someone else's task
     * even if they know the ID.
     */
    public function updateTask(int $userId, int $taskId, array $data): Task
    {
        // This will 404 if the task doesn't belong to this user
        $task = $this->repository->find($userId, $taskId);

        return $this->repository->update($task, $data);
    }

    /**
     * Delete an existing task.
     *
     * Same pattern as updateTask — find first (with user scope), then delete.
     * Returns bool but the controller ignores it and always sends 204.
     */
    public function deleteTask(int $userId, int $taskId): bool
    {
        // This will 404 if the task doesn't belong to this user
        $task = $this->repository->find($userId, $taskId);

        return $this->repository->delete($task);
    }
}
