<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
|--------------------------------------------------------------------------
| Task Model
|--------------------------------------------------------------------------
| An Eloquent model represents a single row in the "tasks" table.
| Eloquent maps the database columns to PHP properties automatically —
| you can do $task->title instead of writing raw SQL.
*/
class Task extends Model
{
    // HasFactory enables Task::factory() in tests and seeders
    use HasFactory;

    /**
     * The $fillable array is a security whitelist.
     *
     * Only fields listed here can be set via mass assignment methods like
     * Task::create($data) or $task->update($data). Any field NOT listed
     * here is silently ignored, even if someone sends it in the request.
     *
     * For example, without this list someone could send { "id": 1 } and
     * potentially overwrite another task. The whitelist prevents that.
     */
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'status',
        'priority',
    ];

    /**
     * $casts tells Eloquent how to convert column values when reading/writing.
     *
     * 'datetime' means created_at and updated_at are returned as Carbon
     * objects (a PHP date library), not raw strings. This lets you do things
     * like $task->created_at->diffForHumans() → "2 minutes ago".
     *
     * Note: status and priority are enums in the database but we store them
     * as strings in PHP — no cast needed for those.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * A task belongs to one user.
     *
     * This defines the inverse of the User→tasks relationship.
     * You can do $task->user to get the User who owns this task.
     * Eloquent knows to join on tasks.user_id = users.id automatically.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
