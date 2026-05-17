<?php

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| This file is the entry point for all API requests. Every URL in the app
| maps to a controller method here. Laravel reads this file automatically
| because it is registered in bootstrap/app.php.
|
| All routes here are prefixed with /api automatically by Laravel.
| So Route::post('/auth/login') becomes reachable at POST /api/auth/login.
*/

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes (no login required)
|--------------------------------------------------------------------------
| These two endpoints are open to everyone because the user doesn't have
| a token yet — they're here to GET a token.
*/

// Create a new account → returns a token immediately after registration
Route::post('/auth/register', [AuthController::class, 'register']);

// Log in with email + password → returns a token on success
Route::post('/auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected routes (login required)
|--------------------------------------------------------------------------
| The auth:sanctum middleware runs before any route in this group.
| It reads the "Authorization: Bearer <token>" header and looks up the
| token in the personal_access_tokens table. If the token is missing or
| invalid, Laravel automatically returns a 401 Unauthorized response
| before your controller code even runs.
*/
Route::middleware('auth:sanctum')->group(function () {

    // Invalidate the current token — the user is "logged out"
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    /*
    | Route::apiResource generates 5 standard RESTful routes in one line:
    |
    |  GET    /api/tasks          → TaskController@index   (list all tasks)
    |  POST   /api/tasks          → TaskController@store   (create a task)
    |  GET    /api/tasks/{id}     → TaskController@show    (get one task)
    |  PUT    /api/tasks/{id}     → TaskController@update  (update a task)
    |  DELETE /api/tasks/{id}     → TaskController@destroy (delete a task)
    |
    | You can run `php artisan route:list` in the terminal to see all routes.
    */
    Route::apiResource('tasks', TaskController::class);
});
