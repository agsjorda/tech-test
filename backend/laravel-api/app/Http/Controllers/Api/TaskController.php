<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DuplicateTaskException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| TaskController
|--------------------------------------------------------------------------
| Handles all HTTP requests for tasks. This controller is deliberately
| thin — it only handles:
|   1. Reading data from the HTTP request
|   2. Calling the appropriate TaskService method
|   3. Returning an HTTP response
|
| Business logic (duplicate checks, scoping, etc.) lives in TaskService,
| not here. This separation makes the logic easier to test independently.
|
| All routes in this controller are protected by auth:sanctum middleware,
| so $request->user() is always available and never null.
*/
class TaskController extends Controller
{
    /**
     * Laravel automatically injects TaskService here via the service container.
     * Because we bound TaskRepositoryInterface → TaskRepository in AppServiceProvider,
     * Laravel knows how to build the full chain: TaskService → TaskRepository → DB.
     */
    public function __construct(private readonly TaskService $taskService) {}

    /**
     * GET /api/tasks
     * GET /api/tasks?status=pending
     * GET /api/tasks?status=completed
     *
     * Returns a paginated list of the authenticated user's tasks.
     * The optional ?status= query parameter filters results.
     *
     * array_filter() removes null/empty values so we don't accidentally
     * filter by an empty status string if the parameter isn't provided.
     *
     * Response 200: { data: [...tasks], links: {...}, meta: { current_page, total, ... } }
     */
    public function index(Request $request): JsonResponse
    {
        // Build the filters array, removing any keys with null values.
        // e.g. ?status=pending  → ['status' => 'pending']
        //      no ?status param → [] (no filter applied)
        $filters = array_filter([
            'status' => $request->query('status'),
        ]);

        $tasks = $this->taskService->listTasks($request->user()->id, $filters);

        return response()->json($tasks);
    }

    /**
     * POST /api/tasks
     *
     * Creates a new task for the authenticated user.
     *
     * StoreTaskRequest runs validation automatically before this method is
     * called — if it fails, Laravel returns a 422 with field errors.
     *
     * The 10-second duplicate check lives in TaskService. If the same user
     * tries to create a task with the same title within 10 seconds, the
     * service throws DuplicateTaskException and we catch it here, returning
     * a 422 with a clear message.
     *
     * Request body:  { title (required), description?, priority? }
     * Response 201:  { id, user_id, title, description, status, priority, created_at, updated_at }
     * Response 422:  { message: "A task with this title..." }  (duplicate)
     * Response 422:  { errors: { title: [...] } }              (validation failure)
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        try {
            // $request->validated() returns only the fields that passed validation.
            // Never pass $request->all() — that could include unexpected fields.
            $task = $this->taskService->createTask($request->validated(), $request->user()->id);
        } catch (DuplicateTaskException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // 201 Created is more accurate than 200 OK for a resource creation
        return response()->json($task, 201);
    }

    /**
     * GET /api/tasks/{id}
     *
     * Returns a single task. The repository's find() uses findOrFail() which
     * automatically returns 404 if the task doesn't exist OR belongs to a
     * different user — so users can never access each other's tasks.
     *
     * Response 200: { id, title, ... }
     * Response 404: { message: "No query results for model..." }
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->taskService->getTask($request->user()->id, $id));
    }

    /**
     * PUT /api/tasks/{id}
     *
     * Updates an existing task. Only the fields you send are updated
     * (because UpdateTaskRequest uses 'sometimes' rules — see that file).
     * Useful for marking a task complete without resending all fields:
     *   { "status": "completed" }
     *
     * Response 200: updated task object
     * Response 404: task not found or belongs to another user
     * Response 422: validation failure
     */
    public function update(UpdateTaskRequest $request, int $id): JsonResponse
    {
        $task = $this->taskService->updateTask($request->user()->id, $id, $request->validated());

        return response()->json($task);
    }

    /**
     * DELETE /api/tasks/{id}
     *
     * Deletes a task. Returns 204 No Content on success (no body needed).
     * Returns 404 if the task doesn't exist or belongs to another user.
     *
     * Response 204: (empty body)
     * Response 404: task not found
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->taskService->deleteTask($request->user()->id, $id);

        // 204 means "success, nothing to return"
        return response()->json(null, 204);
    }
}
