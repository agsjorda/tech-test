<?php

namespace App\Services;

use App\Exceptions\DuplicateTaskException;
use App\Models\Task;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TaskService
{
    public function __construct(
        private readonly TaskRepositoryInterface $repository,
    ) {}

    public function listTasks(int $userId, array $filters): LengthAwarePaginator
    {
        return $this->repository->paginate($userId, $filters);
    }

    public function getTask(int $userId, int $taskId): Task
    {
        return $this->repository->find($userId, $taskId);
    }

    public function createTask(array $data, int $userId): Task
    {
        return DB::transaction(function () use ($data, $userId) {
            if ($this->repository->existsWithTitleWithinSeconds($data['title'], $userId, 10)) {
                throw new DuplicateTaskException();
            }

            return $this->repository->create([...$data, 'user_id' => $userId]);
        });
    }

    public function updateTask(int $userId, int $taskId, array $data): Task
    {
        $task = $this->repository->find($userId, $taskId);

        return $this->repository->update($task, $data);
    }

    public function deleteTask(int $userId, int $taskId): bool
    {
        $task = $this->repository->find($userId, $taskId);

        return $this->repository->delete($task);
    }
}
