<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    // --- Auth ---

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'John Doe',
            'email'                 => 'john@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);
    }

    public function test_user_can_login(): void
    {
        User::factory()->create([
            'email'    => 'john@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_login_with_invalid_credentials_returns_401(): void
    {
        User::factory()->create(['email' => 'john@example.com']);

        $this->postJson('/api/auth/login', [
            'email'    => 'john@example.com',
            'password' => 'wrongpassword',
        ])->assertStatus(401);
    }

    public function test_user_can_logout(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/auth/logout')->assertStatus(200);
    }

    // --- Task access control ---

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/tasks')->assertStatus(401);
    }

    // --- Task CRUD ---

    public function test_authenticated_user_can_list_tasks(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->count(3)->create(['user_id' => $user->id]);

        $this->getJson('/api/tasks')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_user_only_sees_their_own_tasks(): void
    {
        $user = $this->actingAsUser();
        $other = User::factory()->create();

        Task::factory()->count(2)->create(['user_id' => $user->id]);
        Task::factory()->count(5)->create(['user_id' => $other->id]);

        $this->getJson('/api/tasks')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_tasks_can_be_filtered_by_status(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->count(2)->create(['user_id' => $user->id, 'status' => 'pending']);
        Task::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'completed']);

        $this->getJson('/api/tasks?status=pending')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/tasks?status=completed')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_user_can_create_a_task(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/tasks', [
            'title'       => 'My first task',
            'description' => 'Task description',
            'priority'    => 'high',
        ])->assertStatus(201)
            ->assertJsonStructure(['id', 'title', 'description', 'status', 'priority', 'created_at']);
    }

    public function test_create_task_requires_title(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/tasks', ['description' => 'No title'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_duplicate_title_within_10_seconds_returns_422(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/tasks', ['title' => 'Duplicate task'])->assertStatus(201);
        $this->postJson('/api/tasks', ['title' => 'Duplicate task'])->assertStatus(422)
            ->assertJson(['message' => 'A task with this title was created less than 10 seconds ago.']);
    }

    public function test_duplicate_title_from_different_user_is_allowed(): void
    {
        $user1 = $this->actingAsUser();
        Task::factory()->create(['user_id' => $user1->id, 'title' => 'Same title']);

        $user2 = User::factory()->create();
        Sanctum::actingAs($user2);

        $this->postJson('/api/tasks', ['title' => 'Same title'])->assertStatus(201);
    }

    public function test_user_can_update_a_task(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->create(['user_id' => $user->id]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => 'completed'])
            ->assertStatus(200)
            ->assertJsonFragment(['status' => 'completed']);
    }

    public function test_user_cannot_update_another_users_task(): void
    {
        $this->actingAsUser();
        $other = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $other->id]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => 'completed'])
            ->assertStatus(404);
    }

    public function test_user_can_delete_a_task(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->create(['user_id' => $user->id]);

        $this->deleteJson("/api/tasks/{$task->id}")->assertStatus(204);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_user_cannot_delete_another_users_task(): void
    {
        $this->actingAsUser();
        $other = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $other->id]);

        $this->deleteJson("/api/tasks/{$task->id}")->assertStatus(404);
    }
}
