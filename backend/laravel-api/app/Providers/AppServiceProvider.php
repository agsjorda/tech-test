<?php

namespace App\Providers;

use App\Repositories\Contracts\TaskRepositoryInterface;
use App\Repositories\TaskRepository;
use Illuminate\Support\ServiceProvider;

/*
|--------------------------------------------------------------------------
| AppServiceProvider
|--------------------------------------------------------------------------
| Service providers are Laravel's way of wiring things together at startup.
| This file runs once when the application boots, before any request is handled.
|
| Think of it as a configuration file that tells Laravel:
| "When something asks for X, give them Y instead."
*/
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register bindings into Laravel's service container.
     *
     * The service container is Laravel's dependency injection system.
     * When a class type-hints a dependency in its constructor, Laravel
     * automatically resolves and injects it.
     *
     * Here we tell Laravel:
     * "Whenever something asks for TaskRepositoryInterface, create and
     *  inject a TaskRepository instead."
     *
     * This is why TaskService can type-hint TaskRepositoryInterface in its
     * constructor — Laravel knows to give it a TaskRepository.
     *
     * In tests, we can override this binding to inject a mock repository,
     * which lets us test TaskService without a real database.
     */
    public function register(): void
    {
        $this->app->bind(TaskRepositoryInterface::class, TaskRepository::class);
    }

    /**
     * Bootstrap any application services.
     * Runs after all bindings are registered. Used for event listeners,
     * observers, macros, etc. Nothing needed here for now.
     */
    public function boot(): void
    {
        //
    }
}
