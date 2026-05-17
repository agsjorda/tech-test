<?php

namespace Tests\Unit;

use App\Exceptions\DuplicateTaskException;
use App\Models\Task;
use App\Repositories\Contracts\TaskRepositoryInterface;
use App\Services\TaskService;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class TaskServiceTest extends TestCase
{
    private TaskRepositoryInterface&MockObject $repository;
    private TaskService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createMock(TaskRepositoryInterface::class);
        $this->service = new TaskService($this->repository);
    }

    public function test_create_task_throws_when_duplicate_within_10_seconds(): void
    {
        $this->repository
            ->expects($this->once())
            ->method('existsWithTitleWithinSeconds')
            ->with('Buy milk', 1, 10)
            ->willReturn(true);

        $this->repository->expects($this->never())->method('create');

        $this->expectException(DuplicateTaskException::class);

        $this->service->createTask(['title' => 'Buy milk'], userId: 1);
    }

    public function test_create_task_succeeds_when_no_duplicate(): void
    {
        $task = new Task(['title' => 'Buy milk', 'user_id' => 1]);

        $this->repository
            ->expects($this->once())
            ->method('existsWithTitleWithinSeconds')
            ->with('Buy milk', 1, 10)
            ->willReturn(false);

        $this->repository
            ->expects($this->once())
            ->method('create')
            ->willReturn($task);

        $result = $this->service->createTask(['title' => 'Buy milk'], userId: 1);

        $this->assertSame($task, $result);
    }

    public function test_create_task_calls_duplicate_check_with_correct_user_id(): void
    {
        $this->repository
            ->expects($this->once())
            ->method('existsWithTitleWithinSeconds')
            ->with('Task title', 42, 10)
            ->willReturn(false);

        $this->repository->method('create')->willReturn(new Task());

        $this->service->createTask(['title' => 'Task title'], userId: 42);
    }
}
