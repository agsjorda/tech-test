<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/*
|--------------------------------------------------------------------------
| User Model
|--------------------------------------------------------------------------
| Represents a row in the "users" table. Extends Authenticatable instead
| of plain Model because Laravel's auth system needs extra methods like
| getAuthIdentifier(), getAuthPassword(), etc. — Authenticatable provides them.
*/

// PHP 8 attribute syntax — equivalent to protected $fillable = [...]
// Only these fields can be mass-assigned (security whitelist)
#[Fillable(['name', 'email', 'password'])]

// These fields are NEVER included in JSON responses or array output.
// You never want to accidentally expose the hashed password.
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */

    /*
    | HasApiTokens  — from Sanctum. Adds methods like createToken() and
    |                 tokens() to the User model. Required for token-based auth.
    |
    | HasFactory    — enables User::factory() for generating test/seed data.
    |
    | Notifiable    — allows sending notifications (email, SMS, etc.) to users.
    |                 Not used in this app but included by default.
    */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * A user has many tasks.
     *
     * This defines the one-to-many relationship. You can do:
     *   $user->tasks           → all tasks for this user
     *   $user->tasks()->where(...) → filtered tasks query
     *
     * The cascadeOnDelete() in the migration means deleting a user
     * automatically deletes all their tasks too.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Attribute casting for the User model.
     *
     * 'hashed' — automatically bcrypt-hashes the password whenever it's set.
     *   e.g. $user->password = 'secret' stores the bcrypt hash in the DB.
     *   This is why we don't need to call Hash::make() when updating passwords
     *   (though we do in AuthController::register for clarity).
     *
     * 'datetime' — converts email_verified_at to a Carbon date object.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }
}
