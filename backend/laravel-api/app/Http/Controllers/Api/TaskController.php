<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DuplicateTaskException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'status' => $request->query('status'),
        ]);

        $tasks = $this->taskService->listTasks($request->user()->id, $filters);

        return response()->json($tasks);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        try {
            $task = $this->taskService->createTask($request->validated(), $request->user()->id);
        } catch (DuplicateTaskException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($task, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->taskService->getTask($request->user()->id, $id));
    }

    public function update(UpdateTaskRequest $request, int $id): JsonResponse
    {
        $task = $this->taskService->updateTask($request->user()->id, $id, $request->validated());

        return response()->json($task);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->taskService->deleteTask($request->user()->id, $id);

        return response()->json(null, 204);
    }
}
