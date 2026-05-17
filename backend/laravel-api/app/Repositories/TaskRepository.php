<?php

namespace App\Repositories;

use App\Models\Task;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

class TaskRepository implements TaskRepositoryInterface
{
    public function paginate(int $userId, array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Task::where('user_id', $userId);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest()->paginate($perPage);
    }

    public function find(int $userId, int $taskId): Task
    {
        return Task::where('user_id', $userId)->findOrFail($taskId);
    }

    public function create(array $data): Task
    {
        return Task::create($data);
    }

    public function update(Task $task, array $data): Task
    {
        $task->update($data);

        return $task->fresh();
    }

    public function delete(Task $task): bool
    {
        return $task->delete();
    }

    public function existsWithTitleWithinSeconds(string $title, int $userId, int $seconds): bool
    {
        return Task::where('user_id', $userId)
            ->where('title', $title)
            ->where('created_at', '>=', now()->subSeconds($seconds))
            ->exists();
    }
}
