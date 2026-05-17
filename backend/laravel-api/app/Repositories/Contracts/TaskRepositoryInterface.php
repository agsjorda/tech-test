<?php

namespace App\Repositories\Contracts;

use App\Models\Task;
use Illuminate\Pagination\LengthAwarePaginator;

interface TaskRepositoryInterface
{
    public function paginate(int $userId, array $filters, int $perPage = 15): LengthAwarePaginator;

    public function find(int $userId, int $taskId): Task;

    public function create(array $data): Task;

    public function update(Task $task, array $data): Task;

    public function delete(Task $task): bool;

    public function existsWithTitleWithinSeconds(string $title, int $userId, int $seconds): bool;
}
